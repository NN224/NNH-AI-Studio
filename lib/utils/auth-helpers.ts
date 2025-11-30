import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

interface ErrorLike {
  code?: string;
  status?: number;
  message?: string;
}

/**
 * Check if an error is a session expired error
 */
export function isSessionExpiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as ErrorLike;
  return Boolean(
    err.code === "session_expired" ||
      err.status === 400 ||
      err.message?.includes("expired") ||
      err.message?.includes("Invalid Refresh Token") ||
      err.message?.includes("Session Expired") ||
      err.message?.includes("Inactivity"),
  );
}

/**
 * Handle auth errors consistently across the app
 */
export async function handleAuthError(
  error: unknown,
  redirectToLogin = true,
): Promise<void> {
  console.error("Auth error:", error);

  if (isSessionExpiredError(error)) {
    // Clear any stale auth data
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    // Show user-friendly message
    toast.error("Your session has expired. Please log in again.");

    // Redirect to login if requested
    if (redirectToLogin && typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  } else if (error && typeof error === "object" && "message" in error) {
    // Show other error messages
    toast.error(String((error as ErrorLike).message));
  }
}

/**
 * Wrap async functions to handle auth errors
 */
export function withAuthErrorHandling<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, redirectToLogin = true): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleAuthError(error, redirectToLogin);
      throw error;
    }
  }) as T;
}
