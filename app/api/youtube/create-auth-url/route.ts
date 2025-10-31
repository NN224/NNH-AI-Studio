import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube", // Full Access - includes readonly + write (verified in Google Cloud)
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.YT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.YT_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/youtube/oauth-callback`;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Server configuration error (YouTube OAuth)" },
        { status: 500 }
      );
    }

    const state = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const admin = createAdminClient();
    const { error: stateErr } = await admin.from("oauth_states").insert({
      state,
      user_id: user.id,
      // provider: "youtube", // جدولك لا يحتوي هذا العمود
      expires_at: expiresAt.toISOString(),
      used: false,
    });
    if (stateErr) {
      return NextResponse.json(
        { error: "Failed to persist OAuth state" },
        { status: 500 }
      );
    }

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    const authUrl = url.toString();
    return NextResponse.json({ authUrl, url: authUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to create YouTube auth URL" },
      { status: 500 }
    );
  }
}