import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logServerActivity } from "@/server/services/activity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://nnh.ae";

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent(error)}`,
      );
    }
    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent("Missing code/state")}`,
      );
    }

    const supabase = await createClient();
    const { data: stateRecord, error: stateErr } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      // .eq("provider", "youtube") // جدولك لا يحتوي هذا العمود
      .single();

    if (stateErr || !stateRecord) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent("Invalid or expired state")}`,
      );
    }

    const exp = new Date(stateRecord.expires_at);
    if (exp < new Date()) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent("State expired")}`,
      );
    }

    await supabase
      .from("oauth_states")
      .update({ used: true })
      .eq("state", state);

    const clientId = process.env.YT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      process.env.YT_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.YT_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/youtube/oauth-callback`;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent("Server config error")}`,
      );
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent(
          tokenData.error_description ||
            tokenData.error ||
            "Token exchange failed",
        )}`,
      );
    }

    const userinfoRes = await fetch(`${USERINFO_URL}?alt=json`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });
    const userinfo = await userinfoRes.json().catch(() => ({}));

    const channelRes = await fetch(
      `${CHANNELS_URL}?part=id,snippet,statistics&mine=true&maxResults=1&alt=json`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      },
    );
    const channelJson = await channelRes.json().catch(() => ({}));
    const channel = Array.isArray(channelJson?.items)
      ? channelJson.items[0]
      : null;

    const admin = createAdminClient();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (tokenData.expires_in || 3600) * 1000,
    ).toISOString();

    const { error: upErr } = await admin.from("oauth_tokens").upsert(
      {
        user_id: stateRecord.user_id,
        provider: "youtube",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
        account_id: channel?.id || null,
        metadata: {
          email: userinfo?.email || null,
          channel_title: channel?.snippet?.title || null,
          statistics: channel?.statistics || null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

    if (upErr) {
      return NextResponse.redirect(
        `${baseUrl}/youtube-dashboard#error=${encodeURIComponent("Failed to save tokens")}`,
      );
    }

    // Unified activity log: YouTube connected
    try {
      await logServerActivity({
        userId: stateRecord.user_id,
        type: "youtube_connected",
        message: "Connected YouTube account",
        metadata: {
          channel_id: channel?.id || null,
          channel_title: channel?.snippet?.title || null,
          email: userinfo?.email || null,
        },
      });
    } catch {
      // Logging failure should not break the main flow
    }

    return NextResponse.redirect(`${baseUrl}/youtube-dashboard#success=true`);
  } catch (e: any) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://nnh.ae";
    return NextResponse.redirect(
      `${baseUrl}/youtube-dashboard#error=${encodeURIComponent(e.message || "Unexpected error")}`,
    );
  }
}
