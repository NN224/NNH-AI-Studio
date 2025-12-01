/**
 * ============================================================================
 * Cron Job Authentication
 * ============================================================================
 *
 * Provides secure authentication for cron job endpoints.
 *
 * SECURITY: This implementation FAILS CLOSED - if CRON_SECRET is not
 * configured, ALL cron endpoints are BLOCKED.
 *
 * REQUIRED environment variable:
 * - CRON_SECRET (minimum 32 characters recommended)
 */

import { logger } from "@/lib/utils/logger";

/**
 * Result of cron authentication validation
 */
export interface CronAuthResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates cron job authentication.
 *
 * @security CRITICAL - This function MUST:
 * 1. Require CRON_SECRET to be defined
 * 2. Fail CLOSED if secret is missing
 * 3. Use constant-time comparison
 *
 * @param request - The incoming request
 * @returns Validation result with isValid flag and optional error
 */
export function validateCronAuth(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;

  // FAIL CLOSED: Secret MUST be configured
  if (!cronSecret) {
    logger.error(
      "CRON_SECRET is not configured - All cron endpoints are BLOCKED",
      new Error("Missing CRON_SECRET"),
    );
    return {
      isValid: false,
      error: "Server configuration error. Cron jobs are disabled.",
    };
  }

  // Validate minimum secret length
  if (cronSecret.length < 32) {
    logger.warn(
      "CRON_SECRET is too short - Use at least 32 characters for security",
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      isValid: false,
      error: "Missing authorization header",
    };
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(token, cronSecret)) {
    return {
      isValid: false,
      error: "Invalid cron secret",
    };
  }

  return { isValid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Logs unauthorized cron access attempts for security monitoring.
 *
 * @param request - The incoming request
 * @param error - The error message from validation
 */
function logUnauthorizedAttempt(request: Request, error: string): void {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const path = new URL(request.url).pathname;

  logger.warn("Unauthorized cron access attempt", {
    ip,
    path,
    error,
    userAgent: request.headers.get("user-agent"),
  });
}

/**
 * Higher-order function to wrap cron handlers with authentication.
 *
 * Usage:
 * ```typescript
 * async function handleMyCronJob(request: Request) {
 *   // Your cron job logic here
 *   return Response.json({ success: true });
 * }
 *
 * export const GET = withCronAuth(handleMyCronJob);
 * ```
 *
 * @param handler - The cron job handler function
 * @returns Wrapped handler with authentication
 */
export function withCronAuth(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const auth = validateCronAuth(request);

    if (!auth.isValid) {
      logUnauthorizedAttempt(request, auth.error || "Unknown error");

      return Response.json(
        { error: auth.error || "Unauthorized" },
        { status: 401 },
      );
    }

    return handler(request);
  };
}

/**
 * Get the cron secret for use in internal API calls.
 * Returns undefined if not configured (caller should handle this).
 */
export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}
