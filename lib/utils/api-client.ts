/**
 * Secure API client with CSRF protection
 *
 * @deprecated MIGRATION NOTICE (2024-11):
 * This client is maintained for backward compatibility with existing API Routes.
 * For new code, prefer using Next.js Server Actions which handle CSRF automatically.
 *
 * Server Actions benefits:
 * - Automatic CSRF protection via Next.js
 * - Type-safe function calls
 * - No manual token management
 * - Better error handling
 *
 * Example migration:
 * ```ts
 * // Before (API Route + apiClient)
 * const response = await apiClient.post('/api/locations', data);
 *
 * // After (Server Action)
 * import { addLocation } from '@/server/actions/locations';
 * const result = await addLocation(data);
 * ```
 *
 * This file will be removed in a future release once all API Routes
 * are migrated to Server Actions.
 */

let csrfToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

/**
 * Get CSRF token, fetching it if necessary.
 * Uses a singleton promise to prevent multiple concurrent fetches.
 */
async function ensureCSRFToken(): Promise<string> {
  // Return cached token if available
  if (csrfToken) {
    return csrfToken;
  }

  // If a fetch is already in progress, wait for it
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  // Start a new fetch
  tokenFetchPromise = (async () => {
    try {
      const response = await fetch("/api/csrf-token", {
        credentials: "same-origin",
      });
      if (!response.ok) {
        console.error(
          `[api-client] CSRF token fetch failed: ${response.status}`,
        );
        return "";
      }
      const data = await response.json();
      csrfToken = data.token || null;
      return csrfToken || "";
    } catch (error) {
      console.error("[api-client] Failed to fetch CSRF token:", error);
      return "";
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

/**
 * Clear cached CSRF token (useful on 403 responses)
 */
function clearCSRFToken(): void {
  csrfToken = null;
}

/**
 * Enhanced fetch with automatic CSRF token inclusion
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  // Only add CSRF token for state-changing methods
  const method = options.method?.toUpperCase() || "GET";
  const needsCSRF = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  if (needsCSRF) {
    const token = await ensureCSRFToken();

    // Add CSRF token to headers
    options.headers = {
      ...options.headers,
      "X-CSRF-Token": token,
    };
  }

  const response = await fetch(url, options);

  // If we get a CSRF error, clear token and retry once
  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.error?.includes("CSRF")) {
      clearCSRFToken();

      // Get new token from response if provided
      const newToken = data.csrfToken || response.headers.get("X-CSRF-Token");
      if (newToken) {
        csrfToken = newToken;
      } else {
        await ensureCSRFToken();
      }

      // Retry the request with new token
      if (needsCSRF && csrfToken) {
        options.headers = {
          ...options.headers,
          "X-CSRF-Token": csrfToken,
        };
        return fetch(url, options);
      }
    }
  }

  return response;
}

/**
 * Convenience methods for common HTTP verbs
 * @deprecated Use Server Actions instead for new code
 */
export const apiClient = {
  get: (url: string, options?: RequestInit) =>
    secureFetch(url, { ...options, method: "GET" }),

  post: (url: string, data?: Record<string, unknown>, options?: RequestInit) =>
    secureFetch(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (url: string, data?: Record<string, unknown>, options?: RequestInit) =>
    secureFetch(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: (url: string, data?: Record<string, unknown>, options?: RequestInit) =>
    secureFetch(url, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (url: string, options?: RequestInit) =>
    secureFetch(url, { ...options, method: "DELETE" }),
};

// Export as default for easy migration
export default apiClient;
