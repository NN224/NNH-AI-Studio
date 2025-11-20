// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

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
