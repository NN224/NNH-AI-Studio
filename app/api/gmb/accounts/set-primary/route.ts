import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 },
      );
    }

    // Verify the account belongs to this user
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, account_id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 },
      );
    }

    // Set all accounts to inactive for this user
    await supabase
      .from("gmb_accounts")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Set the selected account as active (primary)
    const { error: updateError } = await supabase
      .from("gmb_accounts")
      .update({ is_active: true })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (updateError) {
      gmbLogger.error(
        "Failed to set primary account",
        updateError instanceof Error
          ? updateError
          : new Error(String(updateError)),
        { userId: user.id, accountId },
      );
      return NextResponse.json(
        { error: "Failed to set primary account" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Primary account set successfully",
      accountId: account.id,
    });
  } catch (error) {
    gmbLogger.error(
      "Unexpected error setting primary account",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
