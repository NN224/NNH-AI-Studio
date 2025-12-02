import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

/**
 * Centralized error handler for Next.js API Routes.
 * Logs the error with context and returns a standardized JSON response.
 *
 * @param error The error object (can be any type).
 * @param context A string describing where the error occurred (e.g., '[OAuth Callback]').
 * @param status The HTTP status code to return.
 * @returns A NextResponse object with the error details.
 */
export function handleApiError(
  error: any,
  context: string,
  status: number = 500,
): NextResponse {
  // Properly serialize error message - handle Supabase PostgrestError and other non-Error objects
  const errorMessage =
    error instanceof Error
      ? error.message
      : error?.message || JSON.stringify(error, null, 2) || "Unknown error";
  const errorDetails = error.details || error.hint || "No additional details.";
  const errorCode = error.code || "UNKNOWN_ERROR";

  apiLogger.error(
    `API Error: ${context}`,
    error instanceof Error ? error : new Error(errorMessage),
    {
      code: errorCode,
      details: errorDetails,
    },
  );

  return NextResponse.json(
    {
      error: errorMessage,
      code: errorCode,
      details: errorDetails,
      context: context,
    },
    { status },
  );
}
