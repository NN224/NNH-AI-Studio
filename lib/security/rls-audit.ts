/**
 * ============================================================================
 * RLS Audit Helper
 * ============================================================================
 *
 * Tracks and validates usage of createAdminClient which bypasses RLS.
 *
 * @security CRITICAL - Admin client misuse can cause data breaches
 */

import { logger } from "@/lib/utils/logger";

/**
 * List of API routes that are ALLOWED to use createAdminClient.
 * Any other usage should be reviewed and justified.
 */
export const ALLOWED_ADMIN_CLIENT_ROUTES = [
  // OAuth callbacks - no user session available (SameSite cookies)
  "/api/gmb/oauth-callback",
  "/api/youtube/oauth-callback",
  "/api/auth/callback",

  // Internal/System endpoints - authenticated via secret
  "/api/cron/",
  "/api/webhooks/",
  "/api/gmb/sync-v2",

  // Diagnostic endpoints - admin/debug only
  "/api/diagnostics/",

  // Admin-only endpoints
  "/api/admin/",

  // Cache warming - uses secret token
  "/api/dashboard/overview", // Only when x-cache-warm-token is present
] as const;

/**
 * Checks if a route is allowed to use admin client.
 */
export function isAdminClientAllowed(pathname: string): boolean {
  return ALLOWED_ADMIN_CLIENT_ROUTES.some((allowed) =>
    pathname.startsWith(allowed),
  );
}

/**
 * Logs admin client usage for audit trail.
 * In production, this could send to Sentry or an audit service.
 */
export function logAdminClientUsage(
  pathname: string,
  operation: string,
  userId?: string,
): void {
  const allowed = isAdminClientAllowed(pathname);

  if (!allowed) {
    logger.warn("Unauthorized admin client usage", {
      pathname,
      operation,
      userId,
      warning: "This route is NOT in the allowed list",
    });
  }

  // In production, you might want to:
  // - Send to Sentry as a breadcrumb
  // - Log to audit table
  // - Alert on unauthorized usage
}
