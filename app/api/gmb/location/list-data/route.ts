// app/api/locations/list-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * مسار API لجلب قائمة المواقع التفصيلية لـ Detailed Grid View.
 * يجلب البيانات الأساسية، والـ Health Score، ومقاييس الأداء (Insights).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = user.id;

    // 1. جلب البيانات التفصيلية من جدول المواقع
    // 💡 ملاحظة: يجب أن تكون الأعمدة التالية موجودة ومملوءة في DB:
    //    (address, phone, website, rating, review_count, status, category, health_score, insights_json)
    const { data: locationsData, error: dbError } = await supabase
      .from("gmb_locations")
      .select(
        `
                id,
                name:location_name,
                address,
                phone,
                website,
                rating,
                review_count,
                status,
                category,
                coordinates:latlng,
                regularHours:regularhours,
                businessHours:business_hours,
                metadata,
                response_rate,
                is_syncing,
                ai_insights,
                updated_at,
                created_at
            `,
      )
      .eq("user_id", userId);

    if (dbError) throw dbError;

    // 2. معالجة وتوحيد شكل البيانات للواجهة الأمامية
    const processedLocations = locationsData.map((loc) => {
      const metadata = (loc.metadata as Record<string, any> | null) || {};
      const insights = (metadata.insights_json ||
        metadata.insights ||
        {}) as Record<string, any>;
      const derivedHealth = metadata.health_score ?? metadata.healthScore;
      const derivedVisibility =
        metadata.visibility_score ?? metadata.visibilityScore;
      const derivedPhotos = metadata.mediaCount ?? metadata.photos ?? 0;
      const derivedPosts = metadata.postsCount ?? metadata.posts ?? 0;
      const derivedAttributes =
        metadata.serviceItems ?? metadata.attributes ?? [];
      const lastSync =
        metadata.last_sync ??
        metadata.lastSync ??
        loc.updated_at ??
        loc.created_at;

      return {
        id: loc.id,
        name: loc.name || "Untitled Location",
        address: loc.address || "N/A",
        phone: loc.phone || "N/A",
        website: loc.website || "",
        rating: loc.rating || 0,
        reviewCount: loc.review_count || 0,
        status: loc.status || "pending",
        category: loc.category || "General",
        coordinates: loc.coordinates || { lat: 0, lng: 0 },
        hours: loc.regularHours || loc.businessHours || {},
        attributes: Array.isArray(derivedAttributes) ? derivedAttributes : [],
        photos: Number(derivedPhotos) || 0,
        posts: Number(derivedPosts) || 0,
        healthScore: Number(derivedHealth ?? 0) || 0,
        visibility: Number(derivedVisibility ?? 0) || 0,
        lastSync:
          typeof lastSync === "string"
            ? lastSync
            : lastSync instanceof Date
              ? lastSync.toISOString()
              : new Date().toISOString(),

        // 💡 توحيد شكل الـ Insights
        insights: {
          views: insights.views || 0,
          viewsTrend: insights.viewsTrend || 0,
          clicks: insights.clicks || 0,
          clicksTrend: insights.clicksTrend || 0,
          calls: insights.calls || 0,
          callsTrend: insights.callsTrend || 0,
          directions: insights.directions || 0,
          directionsTrend: insights.directionsTrend || 0,
          weeklyGrowth: insights.weeklyGrowth || 0,
        },
      };
    });

    return NextResponse.json(processedLocations);
  } catch (error: any) {
    gmbLogger.error(
      "API Error fetching detailed locations",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: error.message || "Failed to fetch detailed location list" },
      { status: 500 },
    );
  }
}
