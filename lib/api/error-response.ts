/**
 * ============================================================================
 * Safe API Error Response
 * ============================================================================
 *
 * Creates safe error responses for API routes.
 * NEVER exposes internal error details in production.
 *
 * @security CRITICAL - Prevents information disclosure attacks
 */

import {
  logErrorInternal,
  sanitizeError,
  type SanitizedError,
} from "@/lib/security/error-sanitizer";
import { NextResponse } from "next/server";

/**
 * HTTP status codes for different error types
 */
const ERROR_STATUS_CODES: Record<string, number> = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SENSITIVE_ERROR: 500,
};

/**
 * Error response shape
 */
export interface ErrorResponseBody {
  success: false;
  error: {
    message: string;
    code: string;
    digest?: string;
  };
}

/**
 * Creates a safe error response for API routes.
 * NEVER exposes internal error details in production.
 *
 * @param error - The error to handle
 * @param context - Optional context for logging (path, method, etc.)
 * @returns NextResponse with sanitized error
 *
 * @example
 * ```typescript
 * // In an API route
 * try {
 *   // ... your code
 * } catch (error) {
 *   return createErrorResponse(error, { path: '/api/users', method: 'POST' });
 * }
 * ```
 */
export function createErrorResponse(
  error: unknown,
  context?: { path?: string; method?: string; userId?: string },
): NextResponse<ErrorResponseBody> {
  // Log full error internally (with all details for debugging)
  logErrorInternal(error, context);

  // Get sanitized error for response
  const sanitized: SanitizedError = sanitizeError(error);

  // Determine status code based on error type
  const status = ERROR_STATUS_CODES[sanitized.code] || 500;

  // Build response body
  const body: ErrorResponseBody = {
    success: false,
    error: {
      message: sanitized.message,
      code: sanitized.code,
    },
  };

  // Include digest if available (safe to show - for support reference)
  if (sanitized.digest) {
    body.error.digest = sanitized.digest;
  }

  return NextResponse.json(body, { status });
}

/**
 * Creates a validation error response.
 *
 * @param message - Safe validation message to show to user
 * @param context - Optional context for logging
 */
export function createValidationErrorResponse(
  message: string,
  context?: { path?: string; field?: string },
): NextResponse<ErrorResponseBody> {
  // In production, use generic message if the provided one might leak info
  const safeMessage =
    process.env.NODE_ENV === "production"
      ? "Invalid input. Please check your data and try again."
      : message;

  if (context) {
    console.warn("[Validation Error]", { message, context });
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        message: safeMessage,
        code: "VALIDATION_ERROR",
      },
    },
    { status: 400 },
  );
}

/**
 * Creates a not found error response.
 *
 * @param resource - The type of resource not found (optional)
 */
export function createNotFoundResponse(
  resource?: string,
): NextResponse<ErrorResponseBody> {
  // Never expose what resource was being looked for in production
  const message =
    process.env.NODE_ENV === "production" || !resource
      ? "The requested resource was not found."
      : `${resource} not found.`;

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: "NOT_FOUND",
      },
    },
    { status: 404 },
  );
}

/**
 * Creates an unauthorized error response.
 */
export function createUnauthorizedResponse(): NextResponse<ErrorResponseBody> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "Please sign in to continue.",
        code: "UNAUTHORIZED",
      },
    },
    { status: 401 },
  );
}

/**
 * Creates a forbidden error response.
 */
export function createForbiddenResponse(): NextResponse<ErrorResponseBody> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "You don't have permission to access this resource.",
        code: "FORBIDDEN",
      },
    },
    { status: 403 },
  );
}

/**
 * Creates a rate limited error response.
 */
export function createRateLimitedResponse(): NextResponse<ErrorResponseBody> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "Too many requests. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      },
    },
    { status: 429 },
  );
}
