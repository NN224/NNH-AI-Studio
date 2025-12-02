// This file configures the initialization of Sentry for edge features.
// Edge runtime doesn't support eval() which Sentry uses internally,
// so we disable Sentry in Edge runtime to avoid errors.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// No-op: Sentry is disabled for Edge runtime due to eval() restrictions
console.log("⚠️ Sentry disabled for Edge runtime (eval not supported)");
