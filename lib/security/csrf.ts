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
  // OAuth callbacks (use state parameter for CSRF)
  "/api/auth/callback",
  "/api/gmb/oauth-callback",
  "/api/youtube/oauth-callback",

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

  // Sentry tunnel
  "/api/sentry",
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
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // Check body for form submissions
  // Note: This requires parsing the body which might have already been consumed
  // In practice, you'd want to handle this more carefully
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
    console.error("Error reading CSRF cookie:", error);
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
    console.error("Error setting CSRF cookie:", error);
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
  const requestToken = getCSRFTokenFromRequest(request);

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
    console.error("Failed to get CSRF token:", error);
    return "";
  }
}
