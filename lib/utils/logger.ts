// lib/utils/logger.ts
import * as Sentry from "@sentry/nextjs";

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Log levels supported by the logger
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Centralized logger that integrates with Sentry
 *
 * Usage:
 * ```typescript
 * import { logger } from "@/lib/utils/logger";
 *
 * // Simple error
 * logger.error("Failed to sync", error);
 *
 * // Error with context
 * logger.error("Failed to sync", error, { userId, locationId });
 *
 * // Warning
 * logger.warn("Rate limit approaching", { remaining: 10 });
 *
 * // With module context
 * const gmbLogger = logger.withContext({ module: "gmb" });
 * gmbLogger.error("Sync failed", error);
 * ```
 */
class Logger {
  private context: LogContext = {};

  /**
   * Create a new logger with additional context
   * Context is merged with any existing context
   */
  withContext(context: LogContext): Logger {
    const newLogger = new Logger();
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, data?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, { ...this.context, ...data });
    }
  }

  /**
   * Info logging - adds breadcrumb to Sentry
   */
  info(message: string, data?: LogContext): void {
    console.info(`[INFO] ${message}`, { ...this.context, ...data });

    if (
      typeof window !== "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      Sentry.addBreadcrumb({
        category: "info",
        message,
        data: { ...this.context, ...data },
        level: "info",
      });
    }
  }

  /**
   * Warning logging - adds breadcrumb to Sentry
   */
  warn(message: string, data?: LogContext): void {
    console.warn(`[WARN] ${message}`, { ...this.context, ...data });

    if (
      typeof window !== "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      Sentry.addBreadcrumb({
        category: "warning",
        message,
        data: { ...this.context, ...data },
        level: "warning",
      });
    }
  }

  /**
   * Error logging - captures exception in Sentry
   *
   * @param message - Human readable error message
   * @param error - The error object (optional)
   * @param data - Additional context data (optional)
   */
  error(message: string, error?: Error | unknown, data?: LogContext): void {
    const allContext = { ...this.context, ...data };

    // Always log to console for development
    console.error(`[ERROR] ${message}`, error, allContext);

    // Capture in Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message, ...allContext },
        tags: this.extractTags(allContext),
      });
    } else if (error) {
      Sentry.captureException(new Error(message), {
        extra: { originalError: error, ...allContext },
        tags: this.extractTags(allContext),
      });
    } else {
      Sentry.captureMessage(message, {
        level: "error",
        extra: allContext,
        tags: this.extractTags(allContext),
      });
    }
  }

  /**
   * Extract tags from context for better Sentry filtering
   */
  private extractTags(context: LogContext): Record<string, string> {
    const tags: Record<string, string> = {};

    // Common tags to extract
    const tagKeys = ["module", "action", "userId", "locationId", "accountId"];

    for (const key of tagKeys) {
      if (context[key] && typeof context[key] === "string") {
        tags[key] = context[key] as string;
      }
    }

    return tags;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Pre-configured loggers for common modules
 */
export const gmbLogger = logger.withContext({ module: "gmb" });
export const authLogger = logger.withContext({ module: "auth" });
export const apiLogger = logger.withContext({ module: "api" });
export const syncLogger = logger.withContext({ module: "sync" });
export const reviewsLogger = logger.withContext({ module: "reviews" });
export const postsLogger = logger.withContext({ module: "posts" });
export const questionsLogger = logger.withContext({ module: "questions" });
export const aiLogger = logger.withContext({ module: "ai" });
