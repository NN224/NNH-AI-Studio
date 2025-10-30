import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://nnh.ae";
    const res = await fetch(`${base}/api/youtube/analytics`, { cache: "no-store" });
    const js = await res.json();
    if (!res.ok) {
      return new NextResponse("error\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    const months: string[] = js.months || [];
    const views: number[] = js.viewsPerMonth || [];
    const vids: number[] = js.videosPerMonth || [];

    let csv = "month,views,videos\n";
    months.forEach((m: string, i: number) => {
      csv += `${m},${views[i] || 0},${vids[i] || 0}\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="youtube_analytics.csv"`,
      },
    });
  } catch {
    return new NextResponse("error\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}