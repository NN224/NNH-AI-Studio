"use client";

import {
  getSafeErrorMessage,
  logErrorInternal,
} from "@/lib/security/error-sanitizer";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global Error Boundary
 *
 * @security CRITICAL - NEVER show raw error.message to users in production!
 * This prevents information disclosure attacks.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log full error to Sentry (with all details for debugging)
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "global",
      },
      extra: {
        digest: error.digest,
      },
    });

    // Log internally for server-side monitoring
    logErrorInternal(error, { boundary: "global", digest: error.digest });
  }, [error]);

  // Get safe message (sanitized in production)
  const safeMessage = getSafeErrorMessage(error);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Something went wrong!
          </h1>

          {/* Safe error message (sanitized in production) */}
          <p className="text-gray-400 mb-6">{safeMessage}</p>

          {/* Error digest for support reference (safe to show) */}
          {error.digest && (
            <p className="text-xs text-gray-500 mb-6">
              Error ID: {error.digest}
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>

            <a
              href="/"
              className="block w-full px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Homepage
            </a>
          </div>

          {/* Development only: show full error details */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                Developer Info
              </summary>
              <pre className="mt-2 p-4 bg-gray-900 rounded-lg text-xs text-red-400 overflow-auto max-h-64">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
