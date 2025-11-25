// GMB Status API - Returns connection status for authenticated user
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
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

    // Fetch active GMB account for this user
    const { data: account, error: dbError } = await supabase
      .from("gmb_accounts")
      .select(
        "id, account_id, account_name, email, is_active, last_sync, created_at, token_expires_at",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (dbError && dbError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("[GET /api/gmb/status] DB Error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch status" },
        { status: 500 },
      );
    }

    // Return status object matching GMBStatus interface
    const status = {
      connected: !!account,
      activeAccount: account
        ? {
            id: account.id,
            name: account.account_name || account.email || "GMB Account",
            accountName: account.account_name || "",
            state: "VERIFIED",
            type: "PERSONAL",
            is_active: account.is_active,
          }
        : null,
      lastSync: account?.last_sync || null,
    };

    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error("[GET /api/gmb/status] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
