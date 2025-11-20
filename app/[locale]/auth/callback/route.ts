import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getOriginFromRequest(request: Request): string {
  // Allow explicit override via environment variable
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  const requestUrl = new URL(request.url);

  // Get host from headers (respects reverse proxy/CDN)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host") || requestUrl.host;

  // Determine protocol: prefer forwarded header, then request URL protocol
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");

  // Use forwarded host if available, otherwise host header
  const finalHost = forwardedHost || host;

  return `${proto}://${finalHost}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const baseUrl = getOriginFromRequest(request);

  // Extract locale from URL path (e.g., /en/auth/callback or /ar/auth/callback)
  const pathSegments = requestUrl.pathname.split("/").filter(Boolean);
  const locale =
    pathSegments[0] && (pathSegments[0] === "en" || pathSegments[0] === "ar")
      ? pathSegments[0]
      : "en";

  // Handle OAuth callback from Google (GMB) - check state FIRST
  // Google OAuth sends both code AND state, so we check state first
  if (state) {
    // GMB OAuth is handled by /api/gmb/oauth-callback directly
    // This route should not be used for GMB OAuth
    // Redirect to the Next.js API route instead
    return NextResponse.redirect(
      `${baseUrl}/api/gmb/oauth-callback${requestUrl.search}`,
    );
  }

  // Handle Supabase auth callback (only code, no state)
  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/${locale}/auth/login?error=${encodeURIComponent(error.message)}`,
      );
    }

    // Redirect to home with success
    return NextResponse.redirect(`${baseUrl}/${locale}/home`);
  }

  return NextResponse.redirect(`${baseUrl}/${locale}`);
}
