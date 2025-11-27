import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // Check oauth_states table
    const { data: oauthStates, error: oauthError } = await adminClient
      .from("oauth_states")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Check if user_ids in oauth_states exist in auth.users
    const userChecks: Record<string, boolean> = {};

    if (oauthStates && oauthStates.length > 0) {
      for (const state of oauthStates) {
        if (state.user_id) {
          // Check if user exists in profiles (which references auth.users)
          const { data: profile } = await adminClient
            .from("profiles")
            .select("id")
            .eq("id", state.user_id)
            .maybeSingle();

          userChecks[state.user_id] = !!profile;
        }
      }
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email")
      .limit(10);

    return Response.json({
      success: true,
      oauth_states: {
        count: oauthStates?.length || 0,
        data: oauthStates?.map((s) => ({
          state: s.state?.substring(0, 8) + "...",
          user_id: s.user_id,
          user_exists: userChecks[s.user_id] ?? "unknown",
          used: s.used,
          expires_at: s.expires_at,
          created_at: s.created_at,
        })),
        error: oauthError?.message,
      },
      profiles: {
        count: profiles?.length || 0,
        data: profiles,
        error: profilesError?.message,
      },
      diagnosis: generateDiagnosis(oauthStates, userChecks, profiles),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function generateDiagnosis(
  oauthStates: any[] | null,
  userChecks: Record<string, boolean>,
  profiles: any[] | null,
): string[] {
  const issues: string[] = [];

  if (!oauthStates || oauthStates.length === 0) {
    issues.push("❌ No OAuth states found - OAuth flow may not be starting");
  }

  const invalidUsers = Object.entries(userChecks).filter(
    ([_, exists]) => !exists,
  );
  if (invalidUsers.length > 0) {
    issues.push(
      `❌ ${invalidUsers.length} OAuth states have user_id not in profiles table`,
    );
    issues.push("🔧 This causes foreign key violation when saving GMB account");
  }

  if (!profiles || profiles.length === 0) {
    issues.push("❌ No profiles found - users may not be properly created");
  }

  if (issues.length === 0) {
    issues.push(
      "✅ All checks passed - OAuth states and profiles look correct",
    );
  }

  return issues;
}
