import { requireAdmin } from "@/lib/auth/admin-check";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Check admin access first
    const adminCheck = await requireAdmin();
    if (adminCheck) {
      return adminCheck;
    }

    const supabase = createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "User not authenticated",
        },
        { status: 401 },
      );
    }

    // Check GMB accounts for this user
    const { data: accounts, error: accountsError } = await adminClient
      .from("gmb_accounts")
      .select("*")
      .eq("user_id", user.id);

    // Check sync queue
    const { data: syncQueue, error: syncError } = await adminClient
      .from("sync_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Check locations
    const { data: locations, error: locationsError } = await adminClient
      .from("gmb_locations")
      .select("*")
      .eq("user_id", user.id);

    // Check profiles
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return Response.json({
      success: true,
      debug_info: {
        user_id: user.id,
        user_email: user.email,
        accounts: {
          count: accounts?.length || 0,
          data: accounts,
          error: accountsError?.message,
        },
        sync_queue: {
          count: syncQueue?.length || 0,
          data: syncQueue,
          error: syncError?.message,
        },
        locations: {
          count: locations?.length || 0,
          data: locations,
          error: locationsError?.message,
        },
        profile: {
          exists: !!profile,
          data: profile,
          error: profileError?.message,
        },
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
