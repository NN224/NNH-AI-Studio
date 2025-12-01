// app/api/locations/map-data/route.ts

import { createClient } from "@/lib/supabase/server"; // افترض أن هذا هو مسار عميل Supabase الخاص بالخادم
import { mapLocationCoordinates } from "@/lib/utils/location-coordinates";
import { NextResponse } from "next/server";

// تعريف الواجهة المتوقعة لبيانات الموقع على الخريطة
interface MapLocationData {
  id: string;
  name: string;
  lat: number; // الإحداثيات الجغرافية
  lng: number; // الإحداثيات الجغرافية
  rating: number; // متوسط التقييم
  status: "Verified" | "Suspended" | "Needs Attention"; // الحالة لتحديد لون النقطة
}

/**
 * مسار API لجلب بيانات المواقع اللازمة لعرضها على الخريطة
 */
export async function GET(request: Request) {
  // ⭐️ التعديل هنا: يجب إضافة 'await' قبل createClient()
  const supabase = await createClient();

  // ✅ SECURITY: Enhanced authentication validation
  // Using getUser() instead of getSession() for secure authentication
  // getUser() validates against Supabase Auth server, preventing cookie tampering
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Authentication error:", authError);
    }
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Authentication required. Please sign in again.",
      },
      { status: 401 },
    );
  }

  try {
    const userId = user.id;

    // ✅ SECURITY: Only fetch locations that belong to the user
    // 2. جلب جميع المواقع النشطة للمستخدم
    // 💡 ملاحظة: يجب أن يحتوي جدول gmb_locations على أعمدة lat و lng
    const { data: locations, error: locationError } = await supabase
      .from("gmb_locations")
      .select(
        "id, location_name, latitude, longitude, status, metadata, gmb_account_id, user_id",
      )
      .eq("user_id", userId) // ✅ SECURITY: Ensure user can only access their own locations
      .eq("is_active", true); // ✅ Only fetch active locations

    if (locationError) throw new Error(locationError.message);
    if (!locations || locations.length === 0) return NextResponse.json([]);

    // 3. جلب جميع المراجعات لحساب متوسط التقييم
    // يمكن تحسين هذه الخطوة باستخدام دالة Postgres
    const { data: reviews, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select("location_id, rating")
      .eq("user_id", userId);

    if (reviewError) throw new Error(reviewError.message);

    // 4. معالجة البيانات وحساب متوسط التقييم والحالة
    const processedLocations: MapLocationData[] = (locations || [])
      .map((loc) => {
        const coords = mapLocationCoordinates(loc);
        if (!coords) {
          return null;
        }

        const locationReviews =
          reviews?.filter((r) => r.location_id === loc.id) || [];
        const ratings = locationReviews
          .map((r) => r.rating)
          .filter(
            (rating): rating is number =>
              typeof rating === "number" && rating > 0,
          );

        const totalRating = ratings.reduce((sum, r) => sum + r, 0);
        const averageRating =
          ratings.length > 0
            ? parseFloat((totalRating / ratings.length).toFixed(1))
            : 0;

        const rawStatus = (loc.status || "").toString().toLowerCase();
        let status: MapLocationData["status"] = "Verified";

        if (rawStatus.includes("suspend")) {
          status = "Suspended";
        } else if (
          rawStatus.includes("pending") ||
          rawStatus.includes("unverified")
        ) {
          status = "Needs Attention";
        } else if (averageRating === 0 && ratings.length === 0) {
          status = "Needs Attention";
        } else if (averageRating < 4 && ratings.length > 5) {
          status = "Needs Attention";
        }

        return {
          id: loc.id,
          name: loc.location_name || "Untitled Location",
          lat: coords.lat,
          lng: coords.lng,
          rating: averageRating,
          status,
        };
      })
      .filter((loc): loc is MapLocationData => loc !== null);

    // 5. إرجاع النتائج المعالجة
    return NextResponse.json(processedLocations);
  } catch (error: any) {
    // ✅ ERROR HANDLING: Enhanced error logging
    console.error("API Error fetching map data:", {
      error: error.message,
      stack: error.stack,
      userId: user?.id || "unknown",
      timestamp: new Date().toISOString(),
    });

    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch map data. Please try again later.",
        code: "MAP_DATA_ERROR",
      },
      { status: 500 },
    );
  }
}
