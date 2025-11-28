import { disconnectGMBAccount } from "@/server/actions/gmb-account";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * ✅ UNIFIED: This API route now delegates to the server action for consistency
 * The server action provides better features (export, delete options) and is the single source of truth
 */
export async function POST(request: NextRequest) {
  console.warn("[GMB Disconnect API] Request received");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[GMB Disconnect API] Authentication failed:", authError);
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    console.warn("[GMB Disconnect API] User authenticated:", user.id);

    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;
    const option = body.option || "keep"; // 'keep', 'delete', or 'export'

    if (!accountId) {
      return errorResponse(
        "MISSING_ACCOUNT_ID",
        "accountId is required in request body",
        400,
      );
    }

    console.warn(
      `[GMB Disconnect API] Disconnecting account ${accountId} with option: ${option}`,
    );

    // ✅ Delegate to server action (single source of truth)
    const result = await disconnectGMBAccount(accountId, option);

    if (!result.success) {
      console.error("[GMB Disconnect API] Server action failed:", result.error);
      return errorResponse(
        "DISCONNECT_ERROR",
        result.error || "Failed to disconnect account",
        500,
      );
    }

    console.warn("[GMB Disconnect API] ✅ Account disconnected successfully");

    return successResponse({
      success: true,
      message: result.message || "Account disconnected successfully",
      exportData: result.exportData,
    });
  } catch (error: any) {
    console.error("[GMB Disconnect API] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error?.message || "Failed to disconnect GMB account",
      500,
    );
  }
}
