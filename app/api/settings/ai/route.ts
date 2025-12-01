/**
 * AI Settings API Route
 * Manages AI provider settings (GET, POST)
 */

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET - Fetch AI settings for user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: true });

    if (error) {
      apiLogger.error(
        "Error fetching AI settings",
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 },
      );
    }

    return NextResponse.json(settings || []);
  } catch (error) {
    apiLogger.error(
      "AI Settings GET Error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST - Create new AI setting
 */
export async function POST(request: NextRequest) {
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
    const { provider, api_key, is_active, priority } = body;

    // Validate input
    if (!provider || !api_key) {
      return NextResponse.json(
        { error: "Provider and API key are required" },
        { status: 400 },
      );
    }

    if (!["openai", "anthropic", "google"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Insert new setting
    const { data: newSetting, error } = await supabase
      .from("ai_settings")
      .insert({
        user_id: user.id,
        provider,
        api_key,
        is_active: is_active ?? true,
        priority: priority ?? 1,
      })
      .select()
      .single();

    if (error) {
      apiLogger.error(
        "Error creating AI setting",
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: "Failed to create setting" },
        { status: 500 },
      );
    }

    return NextResponse.json(newSetting, { status: 201 });
  } catch (error) {
    apiLogger.error(
      "AI Settings POST Error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
