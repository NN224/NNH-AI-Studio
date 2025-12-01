/**
 * ============================================================================
 * Error Sanitizer
 * ============================================================================
 *
 * Sanitizes error messages for safe display to users.
 * NEVER expose internal error details in production.
 *
 * @security CRITICAL - Prevents information disclosure attacks
 */

import { logger } from "@/lib/utils/logger";
import * as Sentry from "@sentry/nextjs";

/**
 * Patterns that indicate sensitive information in error messages.
 * These should NEVER be shown to users.
 */
const SENSITIVE_PATTERNS = [
  // Database errors
  /relation ".*" does not exist/i,
  /duplicate key value/i,
  /foreign key constraint/i,
  /column ".*" does not exist/i,
  /syntax error at or near/i,
  /permission denied for/i,
  /violates.*constraint/i,
  /SQLITE_ERROR/i,
  /ER_.*:/i, // MySQL errors

  // File paths
  /\/var\/task\//i,
  /\/home\/.*\//i,
  /\/Users\/.*\//i,
  /node_modules/i,
  /\.js:\d+:\d+/i,
  /\.ts:\d+:\d+/i,
  /\.tsx:\d+:\d+/i,

  // API keys and secrets
  /sk-[a-zA-Z0-9]+/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /bearer\s+[a-zA-Z0-9._-]+/i,
  /authorization:\s*/i,

  // Connection errors (expose infrastructure)
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /ECONNRESET/i,
  /EHOSTUNREACH/i,

  // Stack traces
  /at\s+\w+\s+\(/i,
  /^\s+at\s+/m,
  /Error:\s+/i,

  // Internal paths
  /internal\//i,
  /webpack/i,
  /__webpack/i,
];

/**
 * User-friendly error messages
 */
export const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  SERVER_ERROR: "Our servers are experiencing issues. Please try again later.",
  NOT_FOUND: "The requested resource was not found.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to access this resource.",
  VALIDATION_ERROR: "Invalid input. Please check your data and try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  DEFAULT: "Something went wrong. Please try again.",
};

/**
 * Checks if an error message contains sensitive information.
 */
export function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Determines a safe error message based on error content.
 * NEVER shows technical details in production.
 */
export function getSafeErrorMessage(error: Error): string {
  // In development, show full error for debugging
  if (process.env.NODE_ENV === "development") {
    return error.message;
  }

  const message = error.message.toLowerCase();

  // Check for known safe error types
  if (message.includes("network") || message.includes("fetch failed")) {
    return USER_FRIENDLY_MESSAGES.NETWORK_ERROR;
  }

  if (message.includes("not found") || message.includes("404")) {
    return USER_FRIENDLY_MESSAGES.NOT_FOUND;
  }

  if (message.includes("unauthorized") || message.includes("401")) {
    return USER_FRIENDLY_MESSAGES.UNAUTHORIZED;
  }

  if (message.includes("forbidden") || message.includes("403")) {
    return USER_FRIENDLY_MESSAGES.FORBIDDEN;
  }

  if (message.includes("rate limit") || message.includes("429")) {
    return USER_FRIENDLY_MESSAGES.RATE_LIMITED;
  }

  if (message.includes("validation") || message.includes("invalid")) {
    return USER_FRIENDLY_MESSAGES.VALIDATION_ERROR;
  }

  // Default: NEVER show the actual error message
  return USER_FRIENDLY_MESSAGES.DEFAULT;
}

/**
 * Sanitized error result
 */
export interface SanitizedError {
  message: string;
  code: string;
  digest?: string;
}

/**
 * Sanitizes an error for safe display to users.
 * In production, always returns a generic message.
 */
export function sanitizeError(error: unknown): SanitizedError {
  const isProduction = process.env.NODE_ENV === "production";

  // Default safe response
  const safeResponse: SanitizedError = {
    message: USER_FRIENDLY_MESSAGES.DEFAULT,
    code: "INTERNAL_ERROR",
  };

  if (!(error instanceof Error)) {
    return safeResponse;
  }

  // Include digest if available
  const errorWithDigest = error as Error & { digest?: string };
  if (errorWithDigest.digest) {
    safeResponse.digest = errorWithDigest.digest;
  }

  // In production, ALWAYS return safe message
  if (isProduction) {
    // Check for known error types that have safe messages
    if (error.name === "ValidationError") {
      return {
        ...safeResponse,
        message: USER_FRIENDLY_MESSAGES.VALIDATION_ERROR,
        code: "VALIDATION_ERROR",
      };
    }

    if (
      error.name === "AuthenticationError" ||
      error.message.toLowerCase().includes("unauthorized")
    ) {
      return {
        ...safeResponse,
        message: USER_FRIENDLY_MESSAGES.UNAUTHORIZED,
        code: "AUTHENTICATION_ERROR",
      };
    }

    if (error.name === "NotFoundError") {
      return {
        ...safeResponse,
        message: USER_FRIENDLY_MESSAGES.NOT_FOUND,
        code: "NOT_FOUND",
      };
    }

    return safeResponse;
  }

  // In development, show more details but still sanitize secrets
  if (containsSensitiveInfo(error.message)) {
    return {
      ...safeResponse,
      message: `[SANITIZED] ${error.name}: Contains sensitive information`,
      code: "SENSITIVE_ERROR",
    };
  }

  return {
    message: error.message,
    code: error.name,
    digest: errorWithDigest.digest,
  };
}

/**
 * Logs error internally with full details.
 * This should be used alongside sanitizeError.
 */
export function logErrorInternal(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  // Always log full error internally
  logger.error(
    "Internal Error",
    error instanceof Error ? error : new Error(String(error)),
    context,
  );

  // Send to Sentry in production
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}
