/**
 * Validates required environment variables at startup.
 * Logs warnings for missing variables that could cause runtime issues.
 */
function validateEnvironmentVariables() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Critical variables (will cause auth failures)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY is not set - internal sync endpoints will fail",
    );
  }

  // Important for cron jobs
  if (!process.env.CRON_SECRET) {
    warnings.push(
      "CRON_SECRET is not set - scheduled sync jobs will be blocked",
    );
  }

  // Important for encryption
  if (!process.env.ENCRYPTION_KEY) {
    warnings.push(
      "ENCRYPTION_KEY is not set - OAuth token encryption may fail",
    );
  }

  // Google OAuth
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push(
      "Google OAuth credentials not set - GMB connection will fail",
    );
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn("⚠️ Environment variable warnings:");
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  // Log errors
  if (errors.length > 0) {
    console.error("❌ Critical environment variable errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
  }
}

export async function register() {
  // Validate environment variables on startup
  if (process.env.NODE_ENV === "production") {
    validateEnvironmentVariables();
  }

  // Only load Sentry in Node.js runtime (not Edge - causes eval errors)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  // Skip Sentry in Edge runtime to avoid eval errors
  // Edge runtime doesn't support eval() which Sentry uses internally
}

// onRequestError handler - capture errors to Sentry
// Using Sentry's exported handler directly for proper type compatibility
export { captureRequestError as onRequestError } from "@sentry/nextjs";
