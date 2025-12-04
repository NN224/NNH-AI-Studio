import { apiLogger } from "@/lib/utils/logger";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

/**
 * Generates a cryptographically secure random token for CSRF protection.
 *
 * @returns {string} A 64-character hex string (32 bytes of entropy)
 * @throws {Error} If cryptographically secure random generation is unavailable
 *
 * @security CRITICAL - This function MUST use cryptographic randomness.
 * Never use Math.random() or other predictable sources as it would make
 * CSRF tokens predictable and vulnerable to attacks.
 */
const getRandomToken = (): string => {
  // Server-side: use global.crypto (available in Node.js 19+ and Edge Runtime)
  if (
    typeof window === "undefined" &&
    typeof global !== "undefined" &&
    global.crypto?.getRandomValues
  ) {
    const buffer = new Uint8Array(32);
    global.crypto.getRandomValues(buffer);
    return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Client-side: use window.crypto (Web Crypto API)
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buffer = new Uint8Array(32);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Check for crypto.randomUUID as alternative
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    // randomUUID returns a UUID v4 (122 bits of randomness)
    // Combine two UUIDs for extra entropy
    return (
      crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, "")
    );
  }

  // FAIL SECURELY - Never use weak randomness for security tokens
  throw new Error(
    "CSRF Protection Error: Cryptographically secure random number generation is not available. " +
      "This is required for security. Please ensure your environment supports Web Crypto API " +
      "(Node.js 19+, modern browsers, or Edge Runtime).",
  );
};

// CSRF token configuration
const _CSRF_TOKEN_LENGTH = 32; // Reserved for future use
export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";
const _CSRF_FORM_FIELD = "csrfToken"; // Reserved for form-based CSRF

// Methods that should be protected
const PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

// Paths that should be excluded from CSRF protection
// These have their own authentication mechanisms
const EXCLUDED_PATHS = [
  // OAuth flow (use state parameter for CSRF)
  "/api/auth/callback",
  "/api/gmb/oauth-callback",
  "/api/gmb/create-auth-url",
  "/api/youtube/oauth-callback",
  "/api/youtube/create-auth-url",

  // Webhooks (use signature verification)
  "/api/webhook",
  "/api/webhooks/",

  // Cron jobs (use CRON_SECRET)
  "/api/cron/",
  "/api/gmb/scheduled-sync",

  // CSRF token endpoint itself
  "/api/csrf-token",

  // Health checks
  "/api/health",

  // Sentry tunnel and monitoring
  "/api/sentry",
  "/api/log-errors",
  "/monitoring",

  // Admin endpoints (have their own 2FA auth)
  "/api/admin/",
  "/admin/auth",
  "/en/admin/auth",
  "/ar/admin/auth",

  // GMB endpoints (OAuth protected)
  "/api/gmb/",
  "/select-account",
  "/en/select-account",
  "/ar/select-account",

  // Settings and other pages
  "/settings",
  "/en/settings",
  "/ar/settings",
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return getRandomToken();
}

/**
 * Get CSRF token from request (header or body)
 */
export async function getCSRFTokenFromRequest(
  request: NextRequest,
): Promise<string | null> {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // Check URL params for GET requests with CSRF (rare but possible)
  const url = new URL(request.url);
  const urlToken = url.searchParams.get("csrfToken");
  if (urlToken) {
    return urlToken;
  }

  // Check body for form submissions (POST/PUT/PATCH)
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    try {
      // Clone request to avoid consuming the body
      const clonedRequest = request.clone();
      const contentType = request.headers.get("content-type") || "";

      // Handle JSON body
      if (contentType.includes("application/json")) {
        const body = await clonedRequest.json();
        if (body.csrfToken) {
          return body.csrfToken;
        }
      }

      // Handle form data
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await clonedRequest.text();
        const params = new URLSearchParams(text);
        const formToken = params.get("csrfToken");
        if (formToken) {
          return formToken;
        }
      }

      // Handle multipart form data
      if (contentType.includes("multipart/form-data")) {
        const formData = await clonedRequest.formData();
        const formToken = formData.get("csrfToken");
        if (formToken && typeof formToken === "string") {
          return formToken;
        }
      }
    } catch (error) {
      // Body parsing failed, continue without body token
      apiLogger.debug("Failed to parse body for CSRF token", { error });
    }
  }

  return null;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFTokenFromCookie(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(CSRF_COOKIE_NAME);
    return token?.value || null;
  } catch (error) {
    apiLogger.error(
      "Error reading CSRF cookie",
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

/**
 * Set CSRF token cookie
 */
export async function setCSRFTokenCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  } catch (error) {
    apiLogger.error(
      "Error setting CSRF cookie",
      error instanceof Error ? error : new Error(String(error)),
    );
    // Silently fail - cookie setting may not be available in all contexts
  }
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(
  requestToken: string | null,
  cookieToken: string | null,
): boolean {
  if (!requestToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (requestToken.length !== cookieToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < requestToken.length; i++) {
    result |= requestToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if a request should be protected by CSRF
 */
export function shouldProtectRequest(request: NextRequest): boolean {
  // Only protect state-changing methods
  if (!PROTECTED_METHODS.includes(request.method)) {
    return false;
  }

  // Check if path is excluded
  const pathname = new URL(request.url).pathname;
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return false;
  }

  return true;
}

/**
 * CSRF protection middleware helper
 */
export async function validateCSRF(
  request: NextRequest,
): Promise<{ valid: boolean; token?: string }> {
  // Skip CSRF check for non-protected requests
  if (!shouldProtectRequest(request)) {
    return { valid: true };
  }

  // Get tokens
  const cookieToken = await getCSRFTokenFromCookie();
  const requestToken = await getCSRFTokenFromRequest(request);

  // If no cookie token exists, generate one (but don't set it in middleware)
  // Cookie setting should happen in Route Handlers only
  if (!cookieToken) {
    const newToken = generateCSRFToken();
    // Don't set cookie in middleware - return token for Route Handler to set
    return { valid: false, token: newToken };
  }

  // Verify tokens match
  const valid = verifyCSRFToken(requestToken, cookieToken);
  return { valid, token: cookieToken };
}

/**
 * Client-side helper to get CSRF token
 * This should be called from client components to get the token for requests
 */
export async function getCSRFToken(): Promise<string> {
  try {
    const response = await fetch("/api/csrf-token");
    const data = await response.json();
    return data.token || "";
  } catch (error) {
    apiLogger.error(
      "Failed to get CSRF token",
      error instanceof Error ? error : new Error(String(error)),
    );
    return "";
  }
}
