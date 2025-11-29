/**
 * ============================================================================
 * GMB Sync V2 API Route (INTERNAL ONLY)
 * ============================================================================
 *
 * ⚠️ INTERNAL USE ONLY - NOT FOR PUBLIC ACCESS
 *
 * This endpoint is called by Supabase Edge Functions (gmb-process) to execute
 * the actual sync logic. It requires internal authentication via X-Internal-Run
 * or X-Trigger-Secret headers.
 *
 * PUBLIC USERS SHOULD USE: /api/gmb/sync (lightweight trigger)
 *
 * ARCHITECTURE:
 * 1. User calls /api/gmb/sync → Returns 202 + job_id immediately
 * 2. Job queued to sync_queue table
 * 3. gmb-sync-worker picks job, calls gmb-process Edge Function
 * 4. gmb-process calls THIS endpoint with internal auth
 * 5. This endpoint executes performTransactionalSync with database transactions
 *
 * ============================================================================
 */

import { performTransactionalSync } from "@/server/actions/gmb-sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SyncRequestBody {
  accountId?: string;
  account_id?: string;
  userId?: string;
  user_id?: string;
  includeQuestions?: boolean;
  includePosts?: boolean;
  includeMedia?: boolean;
  includeInsights?: boolean;
  isInternalCall?: boolean;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // -------------------------------------------------------------------------
  // INTERNAL AUTH ONLY - Reject all non-internal requests
  // -------------------------------------------------------------------------
  const internalSecret =
    process.env.CRON_SECRET || process.env.TRIGGER_SECRET || null;
  const internalHeader =
    request.headers.get("X-Internal-Run") ||
    request.headers.get("X-Trigger-Secret") ||
    request.headers.get("X-Internal-Worker");
  const isInternal =
    internalSecret && internalHeader && internalHeader === internalSecret;

  if (!isInternal) {
    console.error("[sync-v2] Unauthorized: Missing or invalid internal auth");
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        message:
          "This endpoint is for internal use only. Use /api/gmb/sync for public access.",
      },
      { status: 401 },
    );
  }

  console.warn("[sync-v2] Internal worker call authorized");

  try {
    const body: SyncRequestBody = await request.json();
    const accountId = body.accountId || body.account_id;
    const includeQuestions =
      typeof body.includeQuestions === "boolean" ? body.includeQuestions : true;
    const includePosts = body.includePosts ?? false;
    const includeMedia = body.includeMedia ?? false;
    const includeInsights = body.includeInsights ?? true;

    if (!accountId) {
      return NextResponse.json(
        { ok: false, error: "accountId is required" },
        { status: 400 },
      );
    }

    // Execute the transactional sync with database transactions
    const result = await performTransactionalSync(
      accountId,
      includeQuestions,
      includePosts,
      includeMedia,
      includeInsights,
      true, // isInternalCall - bypass user auth since we verified internal auth
    );

    const tookMs = Date.now() - startTime;

    console.warn(`[sync-v2] Sync completed for ${accountId} in ${tookMs}ms:`, {
      locations: result.locations_synced,
      reviews: result.reviews_synced,
      questions: result.questions_synced,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      mode: "internal",
      took_ms: tookMs,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal sync error";
    console.error("[sync-v2] Sync failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "sync_failed",
        message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler - Return info about this internal endpoint
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/gmb/sync-v2",
    status: "internal_only",
    description:
      "Internal endpoint for Edge Functions. Use /api/gmb/sync for public access.",
    public_endpoint: "/api/gmb/sync",
  });
}
