/**
 * Common error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { safeCaptureException } from "@/lib/services/sentry-config";
import { apiLogger, logger } from "@/lib/utils/logger";

/**
 * Context metadata for errors
 */
export type ErrorContext = Record<string, unknown>;

/**
 * Safe try-catch wrapper with proper logging
 */
export async function safeTry<T>(
  fn: () => Promise<T> | T,
  options: {
    context?: ErrorContext;
    service?: string;
    operation?: string;
    rethrow?: boolean;
    fallback?: T;
    logLevel?: "error" | "warn" | "info";
  } = {},
): Promise<T> {
  const {
    context = {},
    service = "app",
    operation = "operation",
    rethrow = false,
    fallback = undefined as unknown as T,
    logLevel = "error",
  } = options;

  try {
    return await fn();
  } catch (error: unknown) {
    // Format error for logging
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Create rich context
    const errorContext = {
      ...context,
      service,
      operation,
    };

    // Log based on level
    if (logLevel === "error") {
      apiLogger.error(`${service}:${operation} failed`, {
        error: errorObj,
        ...errorContext,
      });
      // Also send to Sentry if it's a critical error
      safeCaptureException(errorObj, errorContext);
    } else if (logLevel === "warn") {
      apiLogger.warn(`${service}:${operation} issue`, {
        error: errorObj,
        ...errorContext,
      });
    } else {
      apiLogger.info(`${service}:${operation} note`, {
        error: errorObj,
        ...errorContext,
      });
    }

    // Either rethrow or return fallback
    if (rethrow) {
      throw errorObj;
    }

    return fallback;
  }
}

/**
 * Type guard for error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Format API errors consistently
 */
export function formatApiError(
  error: unknown,
  defaultMessage = "An unexpected error occurred",
): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return defaultMessage;
  }
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn("Failed to parse JSON", {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return null;
  }
}
