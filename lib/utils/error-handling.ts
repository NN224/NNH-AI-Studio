import { errorLogger } from "@/lib/services/error-logger";
import { toast } from "sonner";

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackValue?: any;
  context?: {
    component?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  onError?: (error: Error) => void;
  retries?: number;
  retryDelay?: number;
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlerOptions = {},
): T {
  const {
    showToast = true,
    fallbackValue = null,
    context,
    onError,
    retries = 0,
    retryDelay = 1000,
  } = options;

  return (async (...args: Parameters<T>) => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log the error
        await errorLogger.logError(lastError, context);

        // Call custom error handler if provided
        if (onError) {
          onError(lastError);
        }

        // If this is not the last attempt, wait and retry
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * (attempt + 1)),
          );
          continue;
        }

        // Show toast on final failure if enabled
        if (showToast) {
          toast.error(lastError.message || "An unexpected error occurred");
        }

        // Return fallback value instead of throwing
        return fallbackValue;
      }
    }

    // This should never be reached, but TypeScript needs it
    return fallbackValue;
  }) as T;
}

/**
 * Try-catch wrapper for synchronous functions
 */
export function trySafe<T>(
  fn: () => T,
  fallbackValue: T,
  context?: ErrorHandlerOptions["context"],
): T {
  try {
    return fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorLogger.logError(err, context);
    return fallbackValue;
  }
}

/**
 * Async try-catch wrapper
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  fallbackValue: T,
  context?: ErrorHandlerOptions["context"],
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await errorLogger.logError(err, context);
    return fallbackValue;
  }
}

/**
 * Create a safe version of a function that won't throw
 */
export function makeSafe<T extends (...args: any[]) => any>(
  fn: T,
  fallbackValue: ReturnType<T>,
  context?: ErrorHandlerOptions["context"],
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          const err = error instanceof Error ? error : new Error(String(error));
          errorLogger.logError(err, context);
          return fallbackValue;
        });
      }
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errorLogger.logError(err, context);
      return fallbackValue;
    }
  }) as T;
}

/**
 * Ensure a value is an Error object
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (typeof error === "object" && error !== null) {
    return new Error(JSON.stringify(error));
  }
  return new Error("Unknown error");
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return "An unexpected error occurred";
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const networkErrorPatterns = [
    "fetch failed",
    "network error",
    "networkerror",
    "ERR_NETWORK",
    "ERR_INTERNET_DISCONNECTED",
    "ERR_NAME_NOT_RESOLVED",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
  ];

  const message = error.message.toLowerCase();
  return networkErrorPatterns.some((pattern) =>
    message.includes(pattern.toLowerCase()),
  );
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const authErrorPatterns = [
    "unauthorized",
    "unauthenticated",
    "auth",
    "401",
    "forbidden",
    "403",
    "token expired",
    "invalid token",
  ];

  const message = error.message.toLowerCase();
  return authErrorPatterns.some((pattern) =>
    message.includes(pattern.toLowerCase()),
  );
}

/**
 * Create a timeout promise
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ]);
}

/**
 * Default timeout values for different API types
 */
export const API_TIMEOUTS = {
  /** Google APIs - 30 seconds */
  GOOGLE_API: 30000,
  /** Internal APIs - 10 seconds */
  INTERNAL_API: 10000,
  /** AI/LLM APIs - 60 seconds (they can be slow) */
  AI_API: 60000,
  /** Quick operations - 5 seconds */
  QUICK: 5000,
} as const;

/**
 * Fetch with automatic timeout and AbortController support
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUTS.GOOGLE_API,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
