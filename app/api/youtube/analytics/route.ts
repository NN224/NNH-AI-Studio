import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // اجلب آخر ~100 فيديو (كفاية لسنة في أغلب القنوات)
    const videosRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://nnh.ae"}/api/youtube/videos`, { cache: "no-store" });
    const videosJson = await videosRes.json();
    const items: any[] = Array.isArray(videosJson?.items) ? videosJson.items : [];

    // كوّن الأشهر (آخر 12 شهراً)
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(m);
    }

    const viewsMap: Record<string, number> = Object.fromEntries(months.map(m => [m, 0]));
    const countMap: Record<string, number> = Object.fromEntries(months.map(m => [m, 0]));
    let totalViews = 0, totalVideos = 0;

    for (const v of items) {
      const dt = new Date(v.publishedAt);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (viewsMap[key] !== undefined) {
        viewsMap[key] += Number(v.views || 0);
        countMap[key] += 1;
      }
      totalViews += Number(v.views || 0);
      totalVideos += 1;
    }

    const viewsPerMonth = months.map(m => viewsMap[m] || 0);
    const videosPerMonth = months.map(m => countMap[m] || 0);

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      months,
      viewsPerMonth,
      videosPerMonth,
      totalViews,
      totalVideos,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to build analytics" }, { status: 500 });
  }
}