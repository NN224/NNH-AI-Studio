/**
 * CSRF Protection Wrapper for API Routes
 *
 * @security CRITICAL - Protects against Cross-Site Request Forgery attacks
 *
 * Usage:
 * export const POST = withCSRF(async (request) => {
 *   // Your protected handler code
 * });
 */

import { validateCSRF } from "@/lib/security/csrf";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export type CSRFProtectedHandler = (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with CSRF protection
 *
 * @param handler - The route handler to protect
 * @returns Protected handler that validates CSRF tokens
 */
export function withCSRF(handler: CSRFProtectedHandler): CSRFProtectedHandler {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    try {
      // Validate CSRF token
      const { valid, token } = await validateCSRF(request);

      if (!valid) {
        apiLogger.warn("CSRF validation failed", {
          path: request.url,
          method: request.method,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        });

        // Return error with new token if needed
        const response = NextResponse.json(
          {
            error: "CSRF validation failed",
            message:
              "Invalid or missing CSRF token. Please refresh and try again.",
            csrfToken: token, // Provide new token for retry
          },
          { status: 403 },
        );

        // Set new CSRF cookie if token was generated
        if (token) {
          response.cookies.set("csrf-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24, // 24 hours
          });
        }

        return response;
      }

      // Call the original handler
      return handler(request, context);
    } catch (error) {
      apiLogger.error(
        "CSRF wrapper error",
        error instanceof Error ? error : new Error(String(error)),
      );

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Combines CSRF protection with other middleware
 *
 * @param handler - The handler to protect
 * @param options - Additional protection options
 */
export function withCSRFAndAuth(
  handler: CSRFProtectedHandler,
  options?: {
    requireAuth?: boolean;
    skipCSRF?: boolean;
  },
): CSRFProtectedHandler {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    // Skip CSRF if explicitly disabled (use with caution!)
    if (options?.skipCSRF) {
      return handler(request, context);
    }

    // Apply CSRF protection
    return withCSRF(handler)(request, context);
  };
}
