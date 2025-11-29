/**
 * ============================================================================
 * API Error Utilities (Legacy - Use lib/api/secure-handler.ts for new code)
 * ============================================================================
 *
 * @deprecated Use `withSecureApi` from `@/lib/api/secure-handler` for new API routes.
 * This file is maintained for backward compatibility.
 *
 * Migration guide:
 * ```ts
 * // OLD (deprecated):
 * import { ApiError, errorResponse } from '@/utils/api-error';
 *
 * // NEW (recommended):
 * import { withSecureApi, ValidationError, ApiError } from '@/lib/api/secure-handler';
 * ```
 */

import { NextResponse } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Patterns that indicate sensitive database information */
const SENSITIVE_PATTERNS = [
  /column "[\w_]+" does not exist/i,
  /relation "[\w_]+" does not exist/i,
  /foreign key constraint/i,
  /duplicate key value/i,
  /violates unique constraint/i,
  /violates foreign key constraint/i,
  /null value in column/i,
  /invalid input syntax/i,
  /permission denied for/i,
  /connection refused/i,
  /ECONNREFUSED/i,
  /at [\w.]+\s*\(/i, // Stack trace pattern
  /node_modules/i,
  /\.ts:\d+:\d+/i,
  /\.js:\d+:\d+/i,
];

/**
 * Check if an error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitize error message for client response
 */
function sanitizeMessage(message: string): string {
  if (IS_PRODUCTION && containsSensitiveInfo(message)) {
    return "An unexpected error occurred. Please try again later.";
  }
  return message;
}

/**
 * @deprecated Use `ApiError` from `@/lib/api/secure-handler` instead
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = status >= 500 ? "ERR_INTERNAL" : "ERR_CLIENT";
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Create an error response with sanitized error details
 * @deprecated Use `withSecureApi` wrapper instead for automatic error handling
 */
export function errorResponse(error: unknown): NextResponse {
  // Log full error internally
  if (error instanceof Error) {
    console.error("[API Error]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof ApiError && {
        status: error.status,
        code: error.code,
      }),
    });
  } else {
    console.error("[API Error]", error);
  }

  // Handle our ApiError class
  if (error instanceof ApiError) {
    const sanitizedMessage = sanitizeMessage(error.message);

    // In production, don't expose details for 5xx errors
    const safeDetails =
      IS_PRODUCTION && error.status >= 500 ? undefined : error.details;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: sanitizedMessage,
          ...(safeDetails && { details: safeDetails }),
        },
      },
      { status: error.status },
    );
  }

  // Handle generic Error
  if (error instanceof Error) {
    const sanitizedMessage = sanitizeMessage(error.message);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ERR_INTERNAL",
          message: sanitizedMessage,
        },
      },
      { status: 500 },
    );
  }

  // Unknown error type
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR_INTERNAL",
        message: "An unexpected error occurred. Please try again later.",
      },
    },
    { status: 500 },
  );
}

/**
 * Create a success response
 * @deprecated Use `success()` from `@/lib/api/secure-handler` instead
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}
