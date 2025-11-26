import { NextResponse } from "next/server";
import { performTransactionalSync } from "@/server/actions/gmb-sync";

function resolveBaseUrl(request: Request) {
  return (
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.NODE_ENV === "production"
      ? "https://nnh.ae"
      : "http://localhost:5050")
  );
}

export async function POST(request: Request) {
  // INTERNAL AUTH FOR SUPABASE WORKER CALLS
  const internalSecret =
    process.env.CRON_SECRET || process.env.TRIGGER_SECRET || null;
  const internalHeader = request.headers.get("X-Internal-Run");
  const isInternal =
    internalSecret && internalHeader && internalHeader === internalSecret;

  // If internal worker call, bypass user auth and run sync directly
  if (isInternal) {
    console.log("[sync-v2] Internal worker call authorized");

    try {
      const body = await request.json();
      const internalAccountId = body.accountId || body.account_id;
      const internalIncludeQuestions =
        typeof body.includeQuestions === "boolean"
          ? body.includeQuestions
          : true;

      if (!internalAccountId) {
        return NextResponse.json(
          { error: "accountId is required" },
          { status: 400 },
        );
      }

      const result = await performTransactionalSync(
        internalAccountId,
        internalIncludeQuestions,
      );

      return NextResponse.json({
        ...result,
        mode: "internal",
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Internal sync error" },
        { status: 500 },
      );
    }
  }

  let accountId: string | undefined;
  let includeQuestions = true;

  try {
    const body = await request.json();
    accountId = body.accountId || body.account_id;
    if (typeof body.includeQuestions === "boolean") {
      includeQuestions = body.includeQuestions;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }

  try {
    const result = await performTransactionalSync(accountId, includeQuestions);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(
      "[GMB Sync v2] transactional sync failed, falling back to legacy route",
      error,
    );

    try {
      const baseUrl = resolveBaseUrl(request);
      const fallbackResponse = await fetch(`${baseUrl}/api/gmb/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, syncType: "full" }),
      });
      const fallbackData = await fallbackResponse.json().catch(() => ({}));

      if (!fallbackResponse.ok) {
        return NextResponse.json(
          {
            error: error?.message || "Sync failed",
            fallback: fallbackData,
          },
          { status: fallbackResponse.status },
        );
      }

      return NextResponse.json(fallbackData);
    } catch (fallbackError: any) {
      console.error("[GMB Sync v2] legacy fallback failed", fallbackError);
      return NextResponse.json(
        { error: fallbackError?.message || "Legacy fallback failed" },
        { status: 500 },
      );
    }
  }
}
