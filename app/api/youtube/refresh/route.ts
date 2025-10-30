import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: tokenRow, error } = await supabase
      .from("oauth_tokens")
      .select("access_token, metadata")
      .eq("user_id", user.id)
      .eq("provider", "youtube")
      .maybeSingle();
    if (error || !tokenRow?.access_token) {
      return NextResponse.json({ error: "No YouTube token" }, { status: 400 });
    }

    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&maxResults=1&alt=json",
      { headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" } }
    );
    const js = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: js.error?.message || "YouTube fetch failed" }, { status: 400 });
    }
    const ch = Array.isArray(js?.items) ? js.items[0] : null;
    const admin = createAdminClient();
    await admin
      .from("oauth_tokens")
      .update({
        metadata: {
          ...(tokenRow.metadata || {}),
          channel_title: ch?.snippet?.title || null,
          statistics: ch?.statistics || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "youtube");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Refresh failed" }, { status: 500 });
  }
}