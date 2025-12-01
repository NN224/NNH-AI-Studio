// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { initGlobalErrorHandlers } from "@/lib/services/global-error-handlers";
import {
  initSentryWithValidation,
  getRuntimeDSN,
} from "@/lib/services/sentry-config";
import { logger } from "@/lib/utils/logger";

const isProduction = process.env.NODE_ENV === "production";

type IntegrationLookupClient = {
  getIntegrationByName?: (name: string) => unknown;
  getIntegrationById?: (id: string) => unknown;
};

type GlobalSentryState = typeof globalThis & {
  __NNH_SENTRY_CLIENT_INITIALIZED__?: boolean;
  __NNH_SENTRY_REPLAY_CONFIGURED__?: boolean;
  __NNH_GLOBAL_ERROR_HANDLERS_INITIALIZED__?: boolean;
};

const globalState = globalThis as GlobalSentryState;

const detectReplayIntegration = (
  client: IntegrationLookupClient | undefined,
): boolean => {
  if (!client) {
    return false;
  }

  if (typeof client.getIntegrationByName === "function") {
    const replay = client.getIntegrationByName("Replay");
    if (replay) {
      return true;
    }
  }

  if (typeof client.getIntegrationById === "function") {
    const replay = client.getIntegrationById("Replay");
    if (replay) {
      return true;
    }
  }

  return false;
};

const existingClient = Sentry.getClient() as
  | IntegrationLookupClient
  | undefined;

if (existingClient && !globalState.__NNH_SENTRY_CLIENT_INITIALIZED__) {
  globalState.__NNH_SENTRY_CLIENT_INITIALIZED__ = true;
}

if (
  existingClient &&
  detectReplayIntegration(existingClient) &&
  !globalState.__NNH_SENTRY_REPLAY_CONFIGURED__
) {
  globalState.__NNH_SENTRY_REPLAY_CONFIGURED__ = true;
}

const shouldInitializeClient =
  globalState.__NNH_SENTRY_CLIENT_INITIALIZED__ !== true;
const shouldAttachReplay = !globalState.__NNH_SENTRY_REPLAY_CONFIGURED__;

let sentryInitialized = globalState.__NNH_SENTRY_CLIENT_INITIALIZED__ === true;

if (shouldInitializeClient) {
  const customIntegrations = shouldAttachReplay
    ? [Sentry.replayIntegration()]
    : [];

  sentryInitialized = initSentryWithValidation({
    runtime: "client",
    dsn: getRuntimeDSN("client"),
    customIntegrations,
  });

  if (sentryInitialized) {
    globalState.__NNH_SENTRY_CLIENT_INITIALIZED__ = true;
    if (shouldAttachReplay) {
      globalState.__NNH_SENTRY_REPLAY_CONFIGURED__ = true;
    }
  }
} else if (shouldAttachReplay) {
  logger.warn(
    "Sentry client already initialized; skipping additional Replay integration to avoid duplicate instances.",
  );
}

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
if (
  typeof window !== "undefined" &&
  !globalState.__NNH_GLOBAL_ERROR_HANDLERS_INITIALIZED__
) {
  initGlobalErrorHandlers();
  globalState.__NNH_GLOBAL_ERROR_HANDLERS_INITIALIZED__ = true;
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

declare global {
  var __NNH_SENTRY_CLIENT_INITIALIZED__: boolean | undefined;
  var __NNH_SENTRY_REPLAY_CONFIGURED__: boolean | undefined;
  var __NNH_GLOBAL_ERROR_HANDLERS_INITIALIZED__: boolean | undefined;
}
