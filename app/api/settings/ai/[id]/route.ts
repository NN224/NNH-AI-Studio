/**
 * AI Settings API Route (Single Setting)
 * Manages individual AI provider settings (PATCH, DELETE)
 */

import { createClient } from "@/lib/supabase/server";
import { aiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH - Update AI setting
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { is_active, api_key, priority } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (api_key) updates.api_key = api_key;
    if (typeof priority === "number") updates.priority = priority;

    // Update setting
    const { data: updatedSetting, error } = await supabase
      .from("ai_settings")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      aiLogger.error(
        "Error updating AI setting",
        error instanceof Error ? error : new Error(String(error)),
        { settingId: params.id, userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 },
      );
    }

    if (!updatedSetting) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSetting);
  } catch (error) {
    aiLogger.error(
      "AI Settings PATCH Error",
      error instanceof Error ? error : new Error(String(error)),
      { settingId: params.id },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Delete AI setting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete setting
    const { error } = await supabase
      .from("ai_settings")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      aiLogger.error(
        "Error deleting AI setting",
        error instanceof Error ? error : new Error(String(error)),
        { settingId: params.id, userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to delete setting" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    aiLogger.error(
      "AI Settings DELETE Error",
      error instanceof Error ? error : new Error(String(error)),
      { settingId: params.id },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
