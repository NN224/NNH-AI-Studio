import {
  CacheBucket,
  getCacheValue,
  registerCacheWarmer,
  setCacheValue,
} from "@/lib/cache/cache-manager";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { getDashboardOverview } from "@/server/services/dashboard.service";
import type { DashboardSnapshot } from "@/types/dashboard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const DASHBOARD_CACHE_BUCKET = CacheBucket.DASHBOARD_OVERVIEW;
const CACHE_CONTROL_VALUE = "private, max-age=300, stale-while-revalidate=60";

function cacheHeaders(cacheState: "HIT" | "MISS" | "BYPASS"): HeadersInit {
  return {
    "Cache-Control": CACHE_CONTROL_VALUE,
    "X-Cache": cacheState,
  };
}

/**
 * GET /api/dashboard/overview
 *
 * Thin route handler that delegates to the dashboard service.
 * Handles authentication, rate limiting, and caching.
 */
export async function GET(request: Request) {
  try {
    // Check for cache warming request
    const warmToken = request.headers.get("x-cache-warm-token");
    const warmUserId = request.headers.get("x-cache-warm-user");
    const warmSecret = process.env.CACHE_WARMER_TOKEN;
    const isWarmRequest = Boolean(
      warmSecret && warmToken && warmUserId && warmToken === warmSecret,
    );

    // Create appropriate Supabase client
    const supabase = isWarmRequest ? createAdminClient() : await createClient();
    let resolvedUserId: string | null = isWarmRequest
      ? (warmUserId ?? null)
      : null;

    // Authenticate user (skip for warm requests)
    if (!isWarmRequest) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Authentication required. Please sign in again.",
          },
          { status: 401 },
        );
      }

      resolvedUserId = user.id;

      // Rate limiting
      const { success: rateLimitOK, headers } = await checkRateLimit(user.id);
      if (!rateLimitOK) {
        return NextResponse.json(
          {
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retry_after: headers["X-RateLimit-Reset"],
          },
          {
            status: 429,
            headers: headers as HeadersInit,
          },
        );
      }
    } else if (!resolvedUserId) {
      return NextResponse.json(
        { error: "Missing user context for cache warming" },
        { status: 400 },
      );
    }

    // At this point, resolvedUserId is guaranteed to be non-null
    const userId = resolvedUserId!;
    const cacheKey = `${userId}:overview`;

    // Check cache (skip for warm requests)
    if (!isWarmRequest) {
      const cachedSnapshot = await getCacheValue<DashboardSnapshot>(
        DASHBOARD_CACHE_BUCKET,
        cacheKey,
      );
      if (cachedSnapshot) {
        return NextResponse.json(cachedSnapshot, {
          headers: cacheHeaders("HIT"),
        });
      }
    }

    // Delegate to service for data aggregation
    const snapshot = await getDashboardOverview({ supabase, userId });

    // Cache the result
    await setCacheValue(DASHBOARD_CACHE_BUCKET, cacheKey, snapshot);

    return NextResponse.json(snapshot, {
      headers: cacheHeaders(isWarmRequest ? "BYPASS" : "MISS"),
    });
  } catch (error) {
    apiLogger.error(
      "[Dashboard Overview] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: request.headers.get("x-request-id") || undefined },
    );
    return NextResponse.json(
      { error: "Unexpected error while building dashboard overview" },
      { status: 500 },
    );
  }
}

const warmBaseUrl =
  process.env.INTERNAL_CACHE_BASE_URL ||
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL;

if (process.env.CACHE_WARMER_TOKEN && warmBaseUrl) {
  const normalizedBase = warmBaseUrl.replace(/\/$/, "");
  registerCacheWarmer(DASHBOARD_CACHE_BUCKET, async (userId) => {
    try {
      const response = await fetch(`${normalizedBase}/api/dashboard/overview`, {
        headers: {
          "x-cache-warm-token": process.env.CACHE_WARMER_TOKEN as string,
          "x-cache-warm-user": userId,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        apiLogger.warn("[Cache] Dashboard warm request failed", {
          warmBaseUrl: normalizedBase,
          error: String(error),
        });
      }
      return null;
    }
  });
}
