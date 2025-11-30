import { validateSentryDSN } from "@/lib/services/sentry-config";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

class TestSentryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestSentryError";
  }
}

export async function GET() {
  const testId = `test-${Date.now()}`;
  const dsn = process.env.SENTRY_DSN;
  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  try {
    // Check if Sentry is configured
    const client = Sentry.getClient();
    const clientDsn = client?.getOptions()?.dsn;
    const isConfigured = client !== undefined && clientDsn !== undefined;

    // Debug info
    const debugInfo = {
      hasDsn: !!dsn,
      hasPublicDsn: !!publicDsn,
      dsnValid: validateSentryDSN(dsn),
      publicDsnValid: validateSentryDSN(publicDsn),
      hasClient: !!client,
      clientHasDsn: !!clientDsn,
      nodeEnv: process.env.NODE_ENV,
      nextRuntime: process.env.NEXT_RUNTIME,
    };

    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        error: "Sentry is not configured",
        debug: debugInfo,
        hint: "Check if sentry.server.config.ts is being loaded correctly",
      });
    }

    // Capture a test message
    Sentry.captureMessage(`Test message from server: ${testId}`, "info");

    // Capture a test error
    const testError = new TestSentryError(`Test error from server: ${testId}`);
    Sentry.captureException(testError);

    // Flush to ensure events are sent
    await Sentry.flush(2000);

    return NextResponse.json({
      success: true,
      message: "Test events sent to Sentry",
      testId,
      timestamp: new Date().toISOString(),
      checkSentry: "https://nnh-ai-studio.sentry.io/issues/",
      note: "Check Sentry dashboard in 1-2 minutes for the test events",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
