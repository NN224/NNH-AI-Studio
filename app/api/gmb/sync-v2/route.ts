import { performTransactionalSync } from "@/server/actions/gmb-sync";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // INTERNAL AUTH FOR SUPABASE WORKER CALLS
  const internalSecret =
    process.env.CRON_SECRET || process.env.TRIGGER_SECRET || null;
  const internalHeader =
    request.headers.get("X-Internal-Run") ||
    request.headers.get("X-Trigger-Secret") ||
    request.headers.get("X-Internal-Worker");
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

      // performTransactionalSync(accountId, includeQuestions, includePosts, includeMedia, includeInsights, isInternalCall)
      const result = await performTransactionalSync(
        internalAccountId,
        internalIncludeQuestions,
        body.includePosts ?? false,
        body.includeMedia ?? false,
        body.includeInsights ?? true,
        true, // isInternalCall
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
    console.error("[GMB Sync v2] Sync failed:", error);
    return NextResponse.json(
      { error: error?.message || "Sync failed" },
      { status: 500 },
    );
  }
}
