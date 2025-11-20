/**
 * Global error handlers for unhandled errors
 * Captures errors that escape React boundaries
 */

import * as Sentry from "@sentry/nextjs";
import { errorLogger } from "./error-logger";

/**
 * Initialize global error handlers
 * Should be called once when the app starts
 */
export function initGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

    console.error("Unhandled promise rejection:", error);

    // Log to centralized error logger
    errorLogger.logError(error, {
      component: "GlobalErrorHandler",
      action: "unhandledRejection",
      metadata: {
        type: "unhandledRejection",
        promise: event.promise?.toString(),
      },
    });

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        errorType: "unhandledRejection",
      },
      extra: {
        reason: event.reason,
        promise: event.promise?.toString(),
      },
    });
  });

  // Handle global errors
  window.addEventListener("error", (event) => {
    const error =
      event.error instanceof Error ? event.error : new Error(event.message);

    console.error("Global error:", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });

    // Skip if this is a React error boundary error (already handled)
    if (error.message?.includes("React")) {
      return;
    }

    // Log to centralized error logger
    errorLogger.logError(error, {
      component: "GlobalErrorHandler",
      action: "windowError",
      metadata: {
        type: "globalError",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        errorType: "globalError",
      },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Handle React hydration errors
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";

    // Detect React hydration errors
    if (
      message.includes("Hydration") ||
      message.includes("hydration") ||
      message.includes("server HTML") ||
      message.includes("client-side")
    ) {
      const hydrationError = new Error(`React Hydration Error: ${message}`);

      errorLogger.logError(hydrationError, {
        component: "GlobalErrorHandler",
        action: "hydrationError",
        metadata: {
          type: "hydrationError",
          originalMessage: message,
        },
      });

      Sentry.captureException(hydrationError, {
        tags: {
          errorType: "hydrationError",
        },
        extra: {
          consoleArgs: args,
        },
      });
    }

    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Handle resource loading errors (images, scripts, etc.)
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement;

      if (target?.tagName) {
        const tagName = target.tagName.toLowerCase();

        // Only track resource loading errors
        if (["img", "script", "link", "video", "audio"].includes(tagName)) {
          const resourceError = new Error(
            `Failed to load ${tagName}: ${(target as any).src || (target as any).href}`,
          );

          errorLogger.logError(resourceError, {
            component: "GlobalErrorHandler",
            action: "resourceLoadError",
            metadata: {
              type: "resourceLoadError",
              tagName,
              src: (target as any).src || (target as any).href,
            },
          });

          Sentry.captureException(resourceError, {
            tags: {
              errorType: "resourceLoadError",
              resourceType: tagName,
            },
            extra: {
              src: (target as any).src || (target as any).href,
            },
          });
        }
      }
    },
    true,
  ); // Use capture phase to catch resource errors

  console.log("✅ Global error handlers initialized");
}

/**
 * Cleanup global error handlers (useful for testing)
 */
export function cleanupGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  // Note: Cannot fully cleanup without storing references
  // This is a placeholder for future implementation if needed
  console.log("⚠️ Global error handler cleanup not fully implemented");
}
