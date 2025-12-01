import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Server-side endpoint to provide Google Maps configuration
 * This prevents exposing the API key to the client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Google Maps is configured
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ configured: false }, { status: 200 });
    }

    // Return configuration status without exposing the key
    return NextResponse.json({
      configured: true,
      // You can add other non-sensitive configuration here
    });
  } catch (error) {
    console.error("Google Maps config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
