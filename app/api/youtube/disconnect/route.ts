/**
 * YouTube Disconnect API
 *
 * @security Uses createClient with RLS (no admin bypass needed)
 */

import { createClient } from "@/lib/supabase/server";
import { logServerActivity } from "@/server/services/activity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ Use regular client - RLS will filter by user_id automatically
    await supabase
      .from("oauth_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "youtube");

    // Unified activity log: YouTube disconnected
    try {
      await logServerActivity({
        userId: user.id,
        type: "youtube_disconnected",
        message: "Disconnected YouTube account",
      });
    } catch {
      // Logging failure should not break the main flow
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
