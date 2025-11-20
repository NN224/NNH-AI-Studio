/**
 * Unified Sentry configuration and initialization
 * Provides DSN validation and common settings
 */

import * as Sentry from "@sentry/nextjs";

export type SentryRuntime = "client" | "server" | "edge";

export interface SentryInitOptions {
  runtime: SentryRuntime;
  dsn?: string;
  customIntegrations?: any[];
}

/**
 * Validate Sentry DSN format
 */
export function validateSentryDSN(dsn: string | undefined): boolean {
  if (!dsn) return false;

  // Basic DSN format validation: https://[key]@[host]/[project]
  const dsnPattern = /^https?:\/\/[a-zA-Z0-9]+@[a-zA-Z0-9.-]+\/\d+$/;
  return dsnPattern.test(dsn);
}

/**
 * Get common Sentry configuration options
 */
export function getCommonSentryOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // Sample rates
    tracesSampleRate: isProduction ? 0.1 : 1,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Enable logs
    enableLogs: true,

    // Privacy settings
    sendDefaultPii: !isProduction,

    // Console logging integration
    consoleLoggingLevels: isProduction
      ? ["warn", "error"]
      : ["log", "warn", "error"],
  };
}

/**
 * Initialize Sentry with validation and common configuration
 */
export function initSentryWithValidation(options: SentryInitOptions): boolean {
  const { runtime, dsn, customIntegrations = [] } = options;

  // Validate DSN
  if (!validateSentryDSN(dsn)) {
    const dsnWarning = dsn
      ? `Invalid Sentry DSN format for ${runtime} runtime: ${dsn}`
      : `Missing Sentry DSN for ${runtime} runtime`;

    console.warn(`⚠️ ${dsnWarning}`);
    console.warn(`Sentry monitoring is disabled for ${runtime} runtime`);
    return false;
  }

  const commonOptions = getCommonSentryOptions();

  // Build integrations based on runtime
  const integrations = [
    Sentry.consoleLoggingIntegration({
      levels: commonOptions.consoleLoggingLevels as any,
    }),
    ...customIntegrations,
  ];

  // Initialize Sentry
  Sentry.init({
    dsn,
    integrations,
    tracesSampleRate: commonOptions.tracesSampleRate,
    environment: commonOptions.environment,
    enableLogs: commonOptions.enableLogs,
    sendDefaultPii: commonOptions.sendDefaultPii,
  });

  console.log(`✅ Sentry initialized for ${runtime} runtime`);
  return true;
}

/**
 * Get runtime-specific DSN
 */
export function getRuntimeDSN(runtime: SentryRuntime): string | undefined {
  switch (runtime) {
    case "client":
      return process.env.NEXT_PUBLIC_SENTRY_DSN;

    case "server":
      return process.env.SENTRY_DSN;

    case "edge":
      // Edge can use either public or server DSN
      return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

    default:
      return undefined;
  }
}

/**
 * Check if Sentry is properly configured
 */
export function isSentryConfigured(): boolean {
  const client = Sentry.getClient();
  return client !== undefined && client.getOptions().dsn !== undefined;
}

/**
 * Safely capture exception (won't fail if Sentry is not configured)
 */
export function safeCaptureException(
  error: Error,
  context?: Record<string, any>,
): void {
  if (!isSentryConfigured()) {
    console.error("Cannot capture exception: Sentry not configured", error);
    return;
  }

  Sentry.captureException(error, context);
}

/**
 * Safely capture message (won't fail if Sentry is not configured)
 */
export function safeCaptureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, any>,
): void {
  if (!isSentryConfigured()) {
    console.warn("Cannot capture message: Sentry not configured", message);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    ...context,
  });
}
