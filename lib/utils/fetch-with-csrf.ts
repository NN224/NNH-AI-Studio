/**
 * 🔒 FETCH WITH CSRF PROTECTION
 *
 * Global fetch wrapper that automatically adds CSRF token to requests.
 * Use this instead of native fetch() for all API calls that modify data.
 *
 * Usage:
 * ```ts
 * import { fetchWithCSRF } from '@/lib/utils/fetch-with-csrf'
 *
 * const response = await fetchWithCSRF('/api/example', {
 *   method: 'POST',
 *   body: JSON.stringify({ data })
 * })
 * ```
 */

// CSRF constants
const CSRF_HEADER_NAME = "x-csrf-token";

// Cache CSRF token for better performance
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get CSRF token from API endpoint with caching
 */
async function getCachedCSRFToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  // Fetch new token from API
  try {
    const response = await fetch("/api/csrf-token");
    const data = await response.json();

    if (data.token) {
      cachedToken = data.token;
      tokenExpiry = now + TOKEN_CACHE_DURATION;
      return data.token;
    }

    return "";
  } catch (error) {
    console.error("[fetchWithCSRF] Failed to get CSRF token:", error);
    // Return empty string on error - let middleware handle it
    return "";
  }
}

/**
 * Methods that require CSRF protection
 */
const PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

/**
 * Fetch wrapper with automatic CSRF token injection
 *
 * @param input - URL or Request object
 * @param init - Request options
 * @returns Promise<Response>
 */
export async function fetchWithCSRF(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";

  // Only add CSRF token for state-changing methods
  if (PROTECTED_METHODS.includes(method)) {
    const token = await getCachedCSRFToken();

    if (token) {
      // Merge CSRF header with existing headers
      const headers = new Headers(init?.headers);
      headers.set(CSRF_HEADER_NAME, token);

      // Make request with CSRF token
      return fetch(input, {
        ...init,
        headers,
      });
    }
  }

  // For GET requests or if token fetch failed, proceed without CSRF
  return fetch(input, init);
}

/**
 * Clear cached CSRF token (e.g., on logout)
 */
export function clearCSRFToken(): void {
  cachedToken = null;
  tokenExpiry = 0;
}
