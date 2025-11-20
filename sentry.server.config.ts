// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import {
  initSentryWithValidation,
  getRuntimeDSN,
} from "@/lib/services/sentry-config";

// Initialize Sentry with validation
initSentryWithValidation({
  runtime: "server",
  dsn: getRuntimeDSN("server"),
});
