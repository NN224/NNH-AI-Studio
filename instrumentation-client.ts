// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { initGlobalErrorHandlers } from "@/lib/services/global-error-handlers";
import {
  initSentryWithValidation,
  getRuntimeDSN,
} from "@/lib/services/sentry-config";

const isProduction = process.env.NODE_ENV === "production";

// Custom integrations for client
const clientIntegrations = [Sentry.replayIntegration()];

// Initialize Sentry with validation
const sentryInitialized = initSentryWithValidation({
  runtime: "client",
  dsn: getRuntimeDSN("client"),
  customIntegrations: clientIntegrations,
});

// Apply client-specific configuration if Sentry initialized successfully
if (sentryInitialized) {
  const client = Sentry.getClient();
  if (client) {
    // Update client options with replay settings
    const options = client.getOptions();
    Object.assign(options, {
      // Replay session sampling
      replaysSessionSampleRate: isProduction ? 0.1 : 1,
      replaysOnErrorSampleRate: 1.0,

      // Filter out certain errors
      ignoreErrors: [
        // Browser extensions
        "top.GLOBALS",
        // Network errors
        "NetworkError",
        "Failed to fetch",
        // Random plugins/extensions
        "Non-Error promise rejection captured",
        // Sentry internal errors
        "Multiple Sentry Session Replay instances are not supported",
      ],

      beforeSend(event: Sentry.ErrorEvent) {
        // Don't filter events - allow all to be sent
        return event;
      },
    });
  }
}

// Initialize global error handlers after Sentry is configured
if (typeof window !== "undefined") {
  initGlobalErrorHandlers();
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
