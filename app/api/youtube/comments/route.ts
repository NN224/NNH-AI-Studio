import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const COMMENTS_URL = "https://www.googleapis.com/youtube/v3/commentThreads";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: row } = await supabase
      .from("oauth_tokens")
      .select("access_token, account_id")
      .eq("user_id", user.id)
      .eq("provider", "youtube")
      .maybeSingle();

    const accessToken = row?.access_token;
    let channelId = row?.account_id as string | undefined;

    if (!accessToken) return NextResponse.json({ items: [] });

    if (!channelId) {
      const chRes = await fetch(`${CHANNELS_URL}?part=id&mine=true&maxResults=1&alt=json`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      const chJson = await chRes.json().catch(() => ({}));
      channelId = chJson?.items?.[0]?.id;
    }
    if (!channelId) return NextResponse.json({ items: [] });

    const url = `${COMMENTS_URL}?part=snippet,replies&allThreadsRelatedToChannelId=${encodeURIComponent(
      channelId
    )}&order=time&maxResults=20&alt=json`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Check if it's an insufficient scopes error
      if (js?.error?.message?.includes("insufficient") || js?.error?.message?.includes("scope")) {
        return NextResponse.json({ 
          error: "Insufficient authentication scopes. Please reconnect your YouTube account with the required permissions.",
          code: "INSUFFICIENT_SCOPES",
          requiresReconnect: true
        }, { status: 403 });
      }
      return NextResponse.json({ error: js?.error?.message || "YouTube comments fetch failed" }, { status: 400 });
    }

    const items =
      (js?.items || []).map((t: any) => {
        const top = t?.snippet?.topLevelComment?.snippet || {};
        const vidId = t?.snippet?.videoId;
        return {
          id: t?.id,
          author: top?.authorDisplayName || "Unknown",
          text: top?.textDisplay?.replace(/<br>/g, "\n")?.replace(/<[^>]+>/g, "") || "",
          likes: Number(top?.likeCount || 0),
          publishedAt: top?.publishedAt || new Date().toISOString(),
          videoUrl: vidId ? `https://www.youtube.com/watch?v=${vidId}` : "#",
        };
      }) || [];

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load comments" }, { status: 500 });
  }
}