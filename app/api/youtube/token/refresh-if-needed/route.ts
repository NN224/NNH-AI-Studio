import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: row, error } = await supabase
      .from("oauth_tokens")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("provider", "youtube")
      .maybeSingle();
    if (error || !row) return NextResponse.json({ ok: true }); // لا شيء لتحديثه

    const exp = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    const now = Date.now();
    const fiveMin = 5 * 60 * 1000;
    if (!row.refresh_token || (exp && exp - now > fiveMin)) return NextResponse.json({ ok: true }); // لا حاجة

    const clientId = process.env.YT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.YT_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return NextResponse.json({ error: "Server config error" }, { status: 500 });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const js = await res.json();
    if (!res.ok) return NextResponse.json({ error: js.error || "Token refresh failed" }, { status: 400 });

    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + (js.expires_in || 3600) * 1000).toISOString();
    await admin
      .from("oauth_tokens")
      .update({
        access_token: js.access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "youtube");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Refresh-if-needed failed" }, { status: 500 });
  }
}