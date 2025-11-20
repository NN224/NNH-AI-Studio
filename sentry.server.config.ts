// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Disable sending user PII in production for privacy
  sendDefaultPii: process.env.NODE_ENV !== "production",

  // Console logging integration - only errors and warnings in production
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels:
        process.env.NODE_ENV === "production"
          ? ["warn", "error"]
          : ["log", "warn", "error"],
    }),
  ],
});
