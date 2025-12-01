import { createClient } from "@/lib/supabase/server";
import { authLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

// Generic auth wrapper compatible with Next.js App Router route handlers
// Ensures the returned function matches (request: Request) => Promise<Response>
export function withAuth(
  handler: (request: Request, user: any) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      // Check for session expiration
      if (error) {
        authLogger.error(
          "Auth error in API route",
          error instanceof Error ? error : new Error(String(error)),
        );

        // Handle session expiration specifically
        if (
          error.code === "session_expired" ||
          error.message?.includes("expired") ||
          error.message?.includes("Invalid Refresh Token")
        ) {
          return NextResponse.json(
            {
              error: "Session expired",
              code: "session_expired",
              message: "Your session has expired. Please log in again.",
            },
            { status: 401 },
          );
        }

        // Other auth errors
        return NextResponse.json(
          { error: "Unauthorized", message: error.message },
          { status: 401 },
        );
      }

      // No user found
      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized", message: "No authenticated user found" },
          { status: 401 },
        );
      }

      // Call the actual handler with the authenticated user
      return handler(request, user);
    } catch (error: any) {
      authLogger.error(
        "Unexpected error in auth middleware",
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
  };
}
