/**
 * Create Post API Route
 * Uses secure handler with Zod validation
 */

import { createPostSchema } from "@/lib/api/schemas";
import {
  ApiError,
  ErrorCode,
  assertAuthenticated,
  success,
  withSecureApi,
} from "@/lib/api/secure-handler";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Infer the body type from the schema
type CreatePost = z.infer<typeof createPostSchema>;

export const POST = withSecureApi<CreatePost>(
  async (_request, { user, body }) => {
    // User is guaranteed by requireAuth, but TypeScript needs assertion
    assertAuthenticated(user);

    const supabase = await createClient();

    // Body is already validated by Zod schema
    const {
      locationId,
      content,
      callToAction,
      mediaUrl,
      aiGenerated,
      promptUsed,
      tone,
      postType,
      scheduledAt,
    } = body;

    // Verify location belongs to user
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("id, user_id")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      throw new ApiError(
        ErrorCode.NOT_FOUND,
        "Location not found or access denied",
        404,
      );
    }

    // Determine status based on scheduledAt
    const status = scheduledAt ? "scheduled" : "published";
    const publishedAt = scheduledAt ? null : new Date().toISOString();

    // Create the post
    const { data: post, error: insertError } = await supabase
      .from("gmb_posts")
      .insert({
        user_id: user.id,
        location_id: locationId,
        content,
        call_to_action: callToAction,
        media_url: mediaUrl,
        ai_generated: aiGenerated,
        prompt_used: promptUsed,
        tone,
        post_type: postType,
        status,
        scheduled_at: scheduledAt,
        published_at: publishedAt,
      })
      .select()
      .single();

    if (insertError) {
      // Log full error internally
      console.error("[Create Post] Database error:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
      });

      // Check for specific error types
      if (insertError.code === "23505") {
        throw new ApiError(
          ErrorCode.CONFLICT,
          "A similar post already exists",
          409,
        );
      }

      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        "Failed to create post",
        500,
      );
    }

    return success({
      post,
      message:
        status === "scheduled"
          ? "Post scheduled successfully"
          : "Post created successfully",
    });
  },
  {
    bodySchema: createPostSchema,
    requireAuth: true,
  },
);
