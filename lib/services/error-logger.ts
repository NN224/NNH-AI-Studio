/**
 * Centralized error logging service
 */

import React from "react";

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  level: "error" | "warning" | "info";
  timestamp: Date;
  context?: ErrorContext;
  userAgent?: string;
  url?: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private queue: ErrorLog[] = [];
  private isOnline: boolean = true;
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.flushQueue();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error
   */
  async logError(
    error: Error | string,
    context?: ErrorContext,
    level: "error" | "warning" | "info" = "error",
  ): Promise<void> {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      level,
      timestamp: new Date(),
      context,
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorLogger]", errorLog);
    }

    // Add to queue
    this.queue.push(errorLog);

    // Send immediately if online, otherwise queue
    if (this.isOnline) {
      this.scheduleFlush();
    }
  }

  /**
   * Log a warning
   */
  async logWarning(message: string, context?: ErrorContext): Promise<void> {
    return this.logError(message, context, "warning");
  }

  /**
   * Log info
   */
  async logInfo(message: string, context?: ErrorContext): Promise<void> {
    return this.logError(message, context, "info");
  }

  /**
   * Schedule queue flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    // Batch errors and send every 5 seconds
    this.flushTimer = setTimeout(() => {
      this.flushQueue();
      this.flushTimer = null;
    }, 5000);
  }

  /**
   * Flush error queue to server
   */
  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0 || !this.isOnline) return;

    const errors = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch("/api/log-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        // Put errors back in queue if sending failed
        this.queue.unshift(...errors);
      }
    } catch (error) {
      // Put errors back in queue if network failed
      this.queue.unshift(...errors);
      console.error("Failed to send error logs:", error);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear error queue (useful for testing)
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

/**
 * React hook for error logging
 */
export function useErrorLogger() {
  const logError = React.useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorLogger.logError(error, context);
    },
    [],
  );

  const logWarning = React.useCallback(
    (message: string, context?: ErrorContext) => {
      errorLogger.logWarning(message, context);
    },
    [],
  );

  const logInfo = React.useCallback(
    (message: string, context?: ErrorContext) => {
      errorLogger.logInfo(message, context);
    },
    [],
  );

  return { logError, logWarning, logInfo };
}

/**
 * Error logging middleware for API calls
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        context,
      );
      throw error;
    }
  }) as T;
}
