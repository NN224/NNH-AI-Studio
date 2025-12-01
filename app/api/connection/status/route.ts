import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/connection/status
 *
 * Returns unified connection status for GMB and YouTube.
 * Supports partial connections - services can be connected independently.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          hasGmbConnection: false,
          hasYoutubeConnection: false,
          gmbAccount: null,
          youtubeChannelId: null,
          lastGmbSync: null,
          lastYoutubeSync: null,
        },
        { status: 200 }, // Return 200 with false values instead of 401
      );
    }

    // Check GMB connection
    const { data: gmbAccounts } = await supabase
      .from("gmb_accounts")
      .select("id, account_name, account_id, is_active, last_synced_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    const hasGmbConnection = gmbAccounts && gmbAccounts.length > 0;
    const gmbAccount = hasGmbConnection
      ? {
          id: gmbAccounts[0].id,
          name: gmbAccounts[0].account_name,
          accountName: gmbAccounts[0].account_name,
          state: "active",
          type: "gmb",
          is_active: gmbAccounts[0].is_active,
        }
      : null;

    // Check YouTube connection
    const { data: youtubeTokens } = await supabase
      .from("youtube_tokens")
      .select("channel_id, updated_at")
      .eq("user_id", user.id)
      .limit(1);

    const hasYoutubeConnection = youtubeTokens && youtubeTokens.length > 0;
    const youtubeChannelId = hasYoutubeConnection
      ? youtubeTokens[0].channel_id
      : null;

    return NextResponse.json({
      hasGmbConnection,
      hasYoutubeConnection,
      gmbAccount,
      youtubeChannelId,
      lastGmbSync: gmbAccounts?.[0]?.last_synced_at || null,
      lastYoutubeSync: youtubeTokens?.[0]?.updated_at || null,
    });
  } catch (error) {
    apiLogger.error(
      "[Connection Status] Error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        hasGmbConnection: false,
        hasYoutubeConnection: false,
        gmbAccount: null,
        youtubeChannelId: null,
        lastGmbSync: null,
        lastYoutubeSync: null,
      },
      { status: 200 }, // Return 200 with false values instead of 500
    );
  }
}
