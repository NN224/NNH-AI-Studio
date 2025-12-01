import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/media/[id]
 * Delete a single media file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mediaId = params.id;

    // Get media record to find storage path
    const { data: media, error: fetchError } = await supabase
      .from("gmb_media")
      .select("*")
      .eq("id", mediaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Extract file paths from URLs
    const mainPath = extractStoragePath(media.url);
    const thumbPath = media.thumbnail_url
      ? extractStoragePath(media.thumbnail_url)
      : null;

    // Delete from storage
    const pathsToDelete = [mainPath, thumbPath].filter(Boolean) as string[];

    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("gmb-media")
        .remove(pathsToDelete);

      if (storageError) {
        apiLogger.error(
          "Storage deletion error",
          storageError instanceof Error
            ? storageError
            : new Error(String(storageError)),
          { mediaId, userId: user.id },
        );
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("gmb_media")
      .delete()
      .eq("id", mediaId)
      .eq("user_id", user.id);

    if (dbError) {
      apiLogger.error(
        "Database deletion error",
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        { mediaId, userId: user.id },
      );
      return NextResponse.json(
        {
          error: "Failed to delete media record",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error: any) {
    apiLogger.error(
      "Delete media error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: error?.message || "Deletion failed",
      },
      { status: 500 },
    );
  }
}

function extractStoragePath(url: string): string | null {
  try {
    const parts = url.split("/gmb-media/");
    return parts.length > 1 ? parts[1] : null;
  } catch {
    return null;
  }
}
