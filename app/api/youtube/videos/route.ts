import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // احصل على access_token من oauth_tokens
    const { data: tokenRow, error } = await supabase
      .from("oauth_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "youtube")
      .maybeSingle();
    if (error || !tokenRow?.access_token) {
      return NextResponse.json({ items: [] });
    }

    // احصل على uploads playlistId
    const chRes = await fetch(`${CHANNELS_URL}?part=contentDetails&mine=true&maxResults=1&alt=json`, {
      headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" },
    });
    const chJson = await chRes.json().catch(() => ({}));
    if (!chRes.ok) {
      if (chJson?.error?.message?.includes("insufficient") || chJson?.error?.message?.includes("scope")) {
        return NextResponse.json({ 
          error: "Insufficient authentication scopes. Please reconnect your YouTube account.",
          code: "INSUFFICIENT_SCOPES",
          requiresReconnect: true
        }, { status: 403 });
      }
      return NextResponse.json({ items: [] });
    }
    const uploads = chJson?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return NextResponse.json({ items: [] });

    // اجلب عناصر قائمة التشغيل (آخر 8)
    const plRes = await fetch(
      `${PLAYLIST_ITEMS_URL}?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploads)}&maxResults=8&alt=json`,
      { headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" } }
    );
    const plJson = await plRes.json().catch(() => ({}));
    if (!plRes.ok) {
      if (plJson?.error?.message?.includes("insufficient") || plJson?.error?.message?.includes("scope")) {
        return NextResponse.json({ 
          error: "Insufficient authentication scopes. Please reconnect your YouTube account.",
          code: "INSUFFICIENT_SCOPES",
          requiresReconnect: true
        }, { status: 403 });
      }
      return NextResponse.json({ items: [] });
    }
    const videoIds = (plJson?.items || [])
      .map((it: any) => it?.contentDetails?.videoId)
      .filter(Boolean)
      .join(",");

    if (!videoIds) return NextResponse.json({ items: [] });

    // اجلب تفاصيل الفيديوهات (العناوين/المشاهدات/التواريخ/الصور)
    const vidsRes = await fetch(
      `${VIDEOS_URL}?part=snippet,statistics&id=${encodeURIComponent(videoIds)}&maxResults=8&alt=json`,
      { headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" } }
    );
    const vidsJson = await vidsRes.json().catch(() => ({}));
    if (!vidsRes.ok) {
      if (vidsJson?.error?.message?.includes("insufficient") || vidsJson?.error?.message?.includes("scope")) {
        return NextResponse.json({ 
          error: "Insufficient authentication scopes. Please reconnect your YouTube account.",
          code: "INSUFFICIENT_SCOPES",
          requiresReconnect: true
        }, { status: 403 });
      }
      return NextResponse.json({ items: [] });
    }
    const items =
      (vidsJson?.items || []).map((v: any) => ({
        id: v?.id,
        title: v?.snippet?.title || "Untitled",
        thumbnail:
          v?.snippet?.thumbnails?.medium?.url ||
          v?.snippet?.thumbnails?.default?.url ||
          "",
        views: Number(v?.statistics?.viewCount || 0),
        publishedAt: v?.snippet?.publishedAt || new Date().toISOString(),
        url: v?.id ? `https://www.youtube.com/watch?v=${v.id}` : "#",
      })) || [];

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load videos" }, { status: 500 });
  }
}