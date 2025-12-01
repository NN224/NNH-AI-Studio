/**
 * ============================================================================
 * GMB Sync V2 API Route (INTERNAL ONLY)
 * ============================================================================
 *
 * ⚠️ INTERNAL USE ONLY - NOT FOR PUBLIC ACCESS
 *
 * This endpoint is called by Supabase Edge Functions (gmb-process) to execute
 * the actual sync logic. It requires internal authentication via:
 * 1. Supabase Service Role Key (preferred for Edge Functions)
 * 2. HMAC-signed timestamp for replay attack prevention
 * 3. Fallback to shared secret with timestamp validation
 *
 * ARCHITECTURE:
 * 1. Job queued to sync_queue table (via scheduled-sync or webhooks)
 * 2. gmb-sync-worker picks job, calls gmb-process Edge Function
 * 3. gmb-process calls THIS endpoint with internal auth
 * 4. This endpoint executes performTransactionalSync with database transactions
 *
 * SECURITY:
 * - Validates Supabase Service Role Key OR HMAC signature
 * - Rejects requests older than 5 minutes (replay attack prevention)
 * - Logs all authentication attempts for audit trail
 *
 * ============================================================================
 */

import { gmbLogger } from "@/lib/utils/logger";
import { performTransactionalSync } from "@/server/actions/gmb-sync";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Maximum age of request timestamp (5 minutes) to prevent replay attacks
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000;

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
  timestamp?: number;
}

/**
 * Validates HMAC signature for internal requests.
 * Signature = HMAC-SHA256(secret, `${timestamp}:${accountId}`)
 */
function validateHmacSignature(
  signature: string | null,
  timestamp: number,
  accountId: string,
  secret: string,
): boolean {
  if (!signature || !timestamp || !accountId) {
    return false;
  }

  const payload = `${timestamp}:${accountId}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    // Security: fail closed on any comparison error
    return false;
  }
}

/**
 * Validates Supabase Service Role Key.
 * This is the preferred authentication method for Edge Functions.
 */
function validateServiceRoleKey(authHeader: string | null): boolean {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || !authHeader) {
    return false;
  }

  // Expected format: "Bearer <service_role_key>"
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || token.length !== serviceRoleKey.length) {
    return false;
  }

  // Use timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(serviceRoleKey));
  } catch {
    // Security: fail closed on any comparison error
    return false;
  }
}

/**
 * Validates request timestamp to prevent replay attacks.
 */
function isTimestampValid(timestamp: number | undefined): boolean {
  if (!timestamp || typeof timestamp !== "number") {
    return false;
  }

  const now = Date.now();
  const age = Math.abs(now - timestamp);

  return age <= MAX_REQUEST_AGE_MS;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  // -------------------------------------------------------------------------
  // INTERNAL AUTH ONLY - Multi-layer authentication
  // -------------------------------------------------------------------------
  const authHeader = request.headers.get("Authorization");
  const hmacSignature = request.headers.get("X-HMAC-Signature");
  const requestTimestamp = request.headers.get("X-Request-Timestamp");
  const legacySecret =
    request.headers.get("X-Internal-Run") ||
    request.headers.get("X-Trigger-Secret") ||
    request.headers.get("X-Internal-Worker");

  // Parse body early to get timestamp and accountId for HMAC validation
  let body: SyncRequestBody;
  try {
    body = await request.json();
  } catch {
    gmbLogger.error("Invalid JSON body", new Error("Invalid JSON body"), {
      requestId,
    });
    return NextResponse.json(
      { ok: false, error: "invalid_body", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const accountId = body.accountId || body.account_id;
  const timestamp =
    body.timestamp ||
    (requestTimestamp ? parseInt(requestTimestamp, 10) : undefined);

  // Authentication methods (in order of preference):
  // 1. Supabase Service Role Key (most secure for Edge Functions)
  // 2. HMAC signature with timestamp (secure for external cron services)
  // 3. Legacy shared secret with timestamp validation (backward compatible)

  let authMethod: string | null = null;
  let isAuthenticated = false;

  // Method 1: Service Role Key
  if (validateServiceRoleKey(authHeader)) {
    authMethod = "service_role_key";
    isAuthenticated = true;
  }

  // Method 2: HMAC Signature
  if (!isAuthenticated && hmacSignature && accountId) {
    const hmacSecret =
      process.env.INTERNAL_HMAC_SECRET || process.env.CRON_SECRET;
    if (hmacSecret && timestamp && isTimestampValid(timestamp)) {
      if (
        validateHmacSignature(hmacSignature, timestamp, accountId, hmacSecret)
      ) {
        authMethod = "hmac_signature";
        isAuthenticated = true;
      }
    }
  }

  // Method 3: Legacy shared secret (with timestamp validation for security)
  if (!isAuthenticated && legacySecret) {
    const expectedSecret =
      process.env.CRON_SECRET || process.env.TRIGGER_SECRET;
    if (expectedSecret && legacySecret === expectedSecret) {
      // For legacy auth, require timestamp to prevent replay attacks
      if (timestamp && isTimestampValid(timestamp)) {
        authMethod = "legacy_secret_with_timestamp";
        isAuthenticated = true;
      } else if (!timestamp) {
        // Log warning but allow for backward compatibility (temporary)
        gmbLogger.warn(
          "Legacy auth without timestamp - consider upgrading to HMAC",
          { requestId, accountId },
        );
        authMethod = "legacy_secret_no_timestamp";
        isAuthenticated = true;
      }
    }
  }

  if (!isAuthenticated) {
    gmbLogger.error(
      "Unauthorized: No valid authentication method",
      new Error("Unauthorized"),
      {
        requestId,
        hasAuthHeader: !!authHeader,
        hasHmacSignature: !!hmacSignature,
        hasLegacySecret: !!legacySecret,
        hasTimestamp: !!timestamp,
        timestampValid: timestamp ? isTimestampValid(timestamp) : false,
      },
    );
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        message: "This endpoint is for internal use only.",
      },
      { status: 401 },
    );
  }

  // Use warning level for audit trail
  gmbLogger.warn("Internal sync authenticated", { requestId, authMethod });

  try {
    // Body already parsed above for auth validation
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

    gmbLogger.info("Sync completed", {
      requestId,
      accountId,
      tookMs,
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
    gmbLogger.error(
      "Sync failed",
      error instanceof Error ? error : new Error(String(error)),
      { requestId, accountId },
    );

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
    description: "Internal endpoint for Edge Functions and scheduled jobs.",
  });
}
