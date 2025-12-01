/**
 * Global API Client with Error Handling and CSRF Protection
 *
 * Provides a centralized fetch wrapper with:
 * - Automatic CSRF token handling for POST/PUT/DELETE/PATCH
 * - 401 Unauthorized handling
 * - Token expiry detection
 * - Automatic sync pause on auth failures
 * - Toast notifications for user feedback
 */

import { apiLogger } from "@/lib/utils/logger";
import { toast } from "sonner";

// CSRF header name (must match server-side csrf.ts)
const CSRF_HEADER_NAME = "x-csrf-token";

// Global state for auth failure handling
let isHandlingAuthFailure = false;

// Cached CSRF token
let cachedCSRFToken: string | null = null;

/**
 * Fetches CSRF token from server and caches it
 */
async function getCSRFToken(): Promise<string> {
  if (cachedCSRFToken) return cachedCSRFToken;

  try {
    const response = await fetch("/api/csrf-token", {
      credentials: "include", // Include cookies
    });
    const data = await response.json();
    cachedCSRFToken = data.token || data.csrfToken;
    return cachedCSRFToken || "";
  } catch (error) {
    apiLogger.error(
      "Failed to fetch CSRF token",
      error instanceof Error ? error : new Error(String(error)),
    );
    return "";
  }
}

/**
 * Clears cached CSRF token (call on logout or token refresh)
 */
export function clearCSRFToken(): void {
  cachedCSRFToken = null;
}

/**
 * Methods that require CSRF protection
 */
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

/**
 * Check if error is an authentication failure
 */
function isAuthFailure(status: number, data: Record<string, unknown>): boolean {
  if (status === 401) return true;
  if (data?.error === "token_expired") return true;
  if (data?.error === "invalid_token") return true;
  if (data?.error === "unauthorized") return true;

  const message =
    typeof data?.message === "string" ? data.message.toLowerCase() : "";
  return message.includes("token") || message.includes("unauthorized");
}

/**
 * Handle authentication failure
 * - Pause background syncs
 * - Show toast notification
 * - Update UI state to disconnected
 */
async function handleAuthFailure() {
  // Prevent multiple simultaneous handlers
  if (isHandlingAuthFailure) return;
  isHandlingAuthFailure = true;

  try {
    // Show user-friendly notification
    toast.error("Session Expired", {
      description: "Please reconnect your account to continue.",
      duration: 5000,
      action: {
        label: "Reconnect",
        onClick: () => {
          window.location.href = "/settings";
        },
      },
    });

    // Pause any active syncs
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }

    // Update connection status in cache
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("gmb_connection_status", "disconnected");
      localStorage.setItem("auth_failure_timestamp", Date.now().toString());
    }

    // Invalidate React Query cache
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("invalidate:all-queries"));
    }
  } finally {
    // Reset flag after a delay to allow retries
    setTimeout(() => {
      isHandlingAuthFailure = false;
    }, 5000);
  }
}

/**
 * Enhanced fetch with error handling and CSRF protection
 */
export async function apiClient<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  try {
    const method = options?.method?.toUpperCase() || "GET";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    // Add CSRF token for state-changing requests
    if (CSRF_PROTECTED_METHODS.includes(method)) {
      const csrfToken = await getCSRFToken();
      if (csrfToken) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      }
    }

    const response = await fetch(url, {
      ...options,
      credentials: "include", // Include cookies for CSRF
      headers,
    });

    // Handle successful responses
    if (response.ok) {
      return response.json();
    }

    // Parse error response
    const errorData = await response.json().catch(() => ({}));

    // Check for auth failures
    if (isAuthFailure(response.status, errorData)) {
      await handleAuthFailure();
      throw new Error("Authentication expired. Please reconnect your account.");
    }

    // Throw error with message from API
    throw new Error(
      errorData.message || errorData.error || `HTTP ${response.status}`,
    );
  } catch (error) {
    // Re-throw if already handled
    if (error instanceof Error) {
      throw error;
    }

    // Handle network errors
    throw new Error("Network error. Please check your connection.");
  }
}

/**
 * GET request
 */
export async function apiGet<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, { ...options, method: "GET" });
}

/**
 * POST request (with automatic CSRF protection)
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request (with automatic CSRF protection)
 */
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request (with automatic CSRF protection)
 */
export async function apiDelete<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, { ...options, method: "DELETE" });
}

/**
 * Hook into sync context to pause syncs on auth failure
 */
if (typeof window !== "undefined") {
  window.addEventListener("auth:expired", () => {
    // Broadcast to sync context
    const bc = new BroadcastChannel("sync-channel");
    bc.postMessage({ type: "AUTH_EXPIRED" });
    bc.close();
  });
}
