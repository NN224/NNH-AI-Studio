/**
 * Global API Client with Error Handling
 *
 * Provides a centralized fetch wrapper with:
 * - 401 Unauthorized handling
 * - Token expiry detection
 * - Automatic sync pause on auth failures
 * - Toast notifications for user feedback
 */

import { toast } from "sonner";

// Global state for auth failure handling
let isHandlingAuthFailure = false;

/**
 * Check if error is an authentication failure
 */
function isAuthFailure(status: number, data: any): boolean {
  return (
    status === 401 ||
    data?.error === "token_expired" ||
    data?.error === "invalid_token" ||
    data?.error === "unauthorized" ||
    data?.message?.toLowerCase().includes("token") ||
    data?.message?.toLowerCase().includes("unauthorized")
  );
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
 * Enhanced fetch with error handling
 */
export async function apiClient<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
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
export async function apiGet<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, { ...options, method: "GET" });
}

/**
 * POST request
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(
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
