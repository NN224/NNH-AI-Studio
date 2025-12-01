import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, GMB_CONSTANTS } from "@/lib/gmb/helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/locations/[id]/logo
 * Get logo photo for a location from GMB media
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locationId = params.id;

    // Get location from database to find GMB resource name
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("name, gmb_account_id, store_code")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    if (!location.gmb_account_id) {
      return NextResponse.json(
        {
          error:
            "No linked Google account found for this location. Please reconnect your Google account.",
        },
        { status: 400 },
      );
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(
        supabase,
        location.gmb_account_id,
      );
    } catch (tokenError: any) {
      console.error("Failed to obtain access token:", tokenError);
      return NextResponse.json(
        {
          error: tokenError.message || "Failed to obtain Google access token.",
        },
        { status: 401 },
      );
    }

    // Fetch media from Google My Business API
    const mediaUrl = `${GMB_CONSTANTS.GMB_V4_BASE}/${location.name}/media`;
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mediaResponse.ok) {
      console.error("GMB API error:", await mediaResponse.text());
      return NextResponse.json(
        { error: "Failed to fetch media from GMB" },
        { status: mediaResponse.status },
      );
    }

    const mediaData = await mediaResponse.json();
    const mediaItems = mediaData.mediaItems || [];

    // Find logo photo (LOGO category)
    const logoPhoto = mediaItems.find(
      (item: any) => item.locationAssociation?.category === "LOGO",
    );

    if (logoPhoto && logoPhoto.googleUrl) {
      return NextResponse.json({
        url: logoPhoto.googleUrl,
        mediaFormat: logoPhoto.mediaFormat,
        name: logoPhoto.name,
      });
    }

    // If no logo, try to find PROFILE photo as fallback
    const profilePhoto = mediaItems.find(
      (item: any) => item.locationAssociation?.category === "PROFILE",
    );

    if (profilePhoto && profilePhoto.googleUrl) {
      return NextResponse.json({
        url: profilePhoto.googleUrl,
        mediaFormat: profilePhoto.mediaFormat,
        name: profilePhoto.name,
      });
    }

    // No logo found
    return NextResponse.json(
      { error: "No logo found", url: null },
      { status: 404 },
    );
  } catch (error: any) {
    console.error("Error fetching logo:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
