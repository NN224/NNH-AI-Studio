import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logServerActivity } from "@/server/services/activity";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

// DELETE - Delete a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const { postId } = params;

    // Verify post ownership
    const { data: post, error: postError } = await supabase
      .from("gmb_posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (postError || !post) {
      return errorResponse("NOT_FOUND", "Post not found", 404);
    }

    // Don't allow deletion of published posts
    if (post.status === "published") {
      return errorResponse(
        "INVALID_STATUS",
        "Cannot delete published posts",
        400,
      );
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from("gmb_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id);

    if (deleteError) {
      gmbLogger.error(
        "[Posts API] Error deleting post",
        deleteError instanceof Error
          ? deleteError
          : new Error(String(deleteError)),
        { postId, userId: user.id },
      );
      return errorResponse("DATABASE_ERROR", "Failed to delete post", 500);
    }

    // Log activity (unified)
    await logServerActivity({
      userId: user.id,
      type: "post_deleted",
      message: `Deleted GMB post: ${post.title || "Untitled"}`,
      metadata: { post_id: postId },
      actionable: false,
    });

    return successResponse({
      message: "Post deleted successfully",
    });
  } catch (error: any) {
    gmbLogger.error(
      "[Posts API] Unexpected error deleting post",
      error instanceof Error ? error : new Error(String(error)),
      { postId: params.postId },
    );
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}

// PATCH - Update a post
export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const { postId } = params;
    const body = await request.json();

    // Verify post ownership
    const { data: post, error: postError } = await supabase
      .from("gmb_posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (postError || !post) {
      return errorResponse("NOT_FOUND", "Post not found", 404);
    }

    // Don't allow editing published posts
    if (post.status === "published") {
      return errorResponse(
        "INVALID_STATUS",
        "Cannot edit published posts",
        400,
      );
    }

    // Update the post
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.media_url !== undefined) updateData.media_url = body.media_url;
    if (body.call_to_action !== undefined)
      updateData.call_to_action = body.call_to_action;
    if (body.call_to_action_url !== undefined)
      updateData.call_to_action_url = body.call_to_action_url;
    if (body.scheduled_at !== undefined) {
      updateData.scheduled_at = body.scheduled_at;
      updateData.status = body.scheduled_at ? "queued" : "draft";
    }
    if (body.post_type !== undefined) updateData.post_type = body.post_type;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const { data: updatedPost, error: updateError } = await supabase
      .from("gmb_posts")
      .update(updateData)
      .eq("id", postId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      gmbLogger.error(
        "[Posts API] Error updating post",
        updateError instanceof Error
          ? updateError
          : new Error(String(updateError)),
        { postId, userId: user.id },
      );
      return errorResponse("DATABASE_ERROR", "Failed to update post", 500);
    }

    // Log activity (unified)
    await logServerActivity({
      userId: user.id,
      type: "post_updated",
      message: `Updated GMB post: ${updatedPost.title || "Untitled"}`,
      metadata: { post_id: postId },
    });

    return successResponse({
      post: updatedPost,
      message: "Post updated successfully",
    });
  } catch (error: any) {
    gmbLogger.error(
      "[Posts API] Unexpected error updating post",
      error instanceof Error ? error : new Error(String(error)),
      { postId: params.postId },
    );
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
