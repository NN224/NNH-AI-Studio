import { logAction } from "@/lib/monitoring/audit";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AuditPayload = {
  action?: string;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as AuditPayload | null;
    const { action, resourceType, resourceId, metadata } = body || {};

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 },
      );
    }

    await logAction(action, resourceType, resourceId, metadata);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("[Audit API] Failed to record audit event", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to log action",
      },
      { status: 500 },
    );
  }
}
