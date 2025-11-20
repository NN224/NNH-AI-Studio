// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({
      levels:
        process.env.NODE_ENV === "production"
          ? ["warn", "error"]
          : ["log", "warn", "error"],
    }),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Disable sending user PII in production for privacy
  sendDefaultPii: process.env.NODE_ENV !== "production",

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

  beforeSend(event) {
    // Don't filter events - allow all to be sent
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
