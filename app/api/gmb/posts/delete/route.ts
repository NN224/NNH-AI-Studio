import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = await request.json().catch(() => ({}));
    const postId = body.postId || body.id;

    if (!postId) {
      return errorResponse("MISSING_FIELDS", "Post ID is required", 400);
    }

    // Verify post ownership and check if it belongs to an active account
    const { data: post } = await supabase
      .from("gmb_posts")
      .select(
        "id, location_id, gmb_locations!inner(id, gmb_account_id, gmb_accounts!inner(id, is_active))",
      )
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!post) {
      return errorResponse("NOT_FOUND", "Post not found", 404);
    }

    // Check if the post belongs to an active account
    const location = (post as any).gmb_locations;
    if (location?.gmb_accounts && !location.gmb_accounts.is_active) {
      return errorResponse(
        "FORBIDDEN",
        "Cannot delete posts for inactive accounts",
        403,
      );
    }

    const { error } = await supabase
      .from("gmb_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id);

    if (error) {
      gmbLogger.error(
        "[GMB Posts Delete API] Error",
        error instanceof Error ? error : new Error(String(error)),
        { postId, userId: user.id },
      );
      return errorResponse("DATABASE_ERROR", "Failed to delete post", 500);
    }

    return successResponse({ message: "Post deleted successfully" });
  } catch (e: unknown) {
    gmbLogger.error(
      "[GMB Posts Delete API] Unexpected error",
      e instanceof Error ? e : new Error(String(e)),
      { postId: undefined },
    );
    return errorResponse(
      "INTERNAL_ERROR",
      e instanceof Error ? e.message : "Failed to delete post",
      500,
    );
  }
}
