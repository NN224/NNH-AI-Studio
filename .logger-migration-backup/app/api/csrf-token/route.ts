import { CSRF_COOKIE_NAME, generateCSRFToken } from "@/lib/security/csrf";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET endpoint to retrieve CSRF token for client-side requests.
 * Returns token in both response body and HttpOnly cookie.
 *
 * The double-submit cookie pattern:
 * 1. Client fetches this endpoint to get token
 * 2. Token is stored in HttpOnly cookie (browser sends automatically)
 * 3. Client also sends token in X-CSRF-Token header
 * 4. Middleware validates header matches cookie
 */
export async function GET(request: NextRequest) {
  try {
    // Check if token already exists in cookie
    const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

    // Use existing token or generate new one
    const token = existingToken || generateCSRFToken();

    // Create response with token in body
    const response = NextResponse.json({ token, csrfToken: token });

    // Set/refresh cookie with secure attributes
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("CSRF token generation error:", message);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 },
    );
  }
}
