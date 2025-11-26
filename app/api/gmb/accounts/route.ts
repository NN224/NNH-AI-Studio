// GMB Accounts API - Returns list of connected GMB accounts for authenticated user
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch GMB accounts with their locations
    const { data: accounts, error: dbError } = await supabase
      .from("gmb_accounts")
      .select(
        `
        id,
        account_id,
        account_name,
        email,
        is_active,
        last_sync,
        created_at,
        token_expires_at,
        gmb_locations (
          id,
          location_name,
          address
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("[GET /api/gmb/accounts] DB Error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 },
      );
    }

    // Transform data to include location count
    const accountsWithLocationCount = (accounts || []).map((account) => ({
      ...account,
      locations: account.gmb_locations || [],
      location_count: account.gmb_locations?.length || 0,
    }));

    // Return response with accounts key for consistency
    return NextResponse.json({ accounts: accountsWithLocationCount });
  } catch (error: any) {
    console.error("[GET /api/gmb/accounts] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
