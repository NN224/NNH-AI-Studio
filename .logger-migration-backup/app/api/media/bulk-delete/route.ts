import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface DeleteResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * POST /api/media/bulk-delete
 * Delete multiple media files
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mediaIds } = await request.json();

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: "No media IDs provided" },
        { status: 400 },
      );
    }

    const results: DeleteResult[] = [];
    let deleted = 0;
    let failed = 0;

    for (const mediaId of mediaIds) {
      try {
        // Get media record
        const { data: media, error: fetchError } = await supabase
          .from("gmb_media")
          .select("*")
          .eq("id", mediaId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !media) {
          results.push({
            id: mediaId,
            success: false,
            error: "Media not found",
          });
          failed++;
          continue;
        }

        // Extract file paths
        const mainPath = extractStoragePath(media.url);
        const thumbPath = media.thumbnail_url
          ? extractStoragePath(media.thumbnail_url)
          : null;
        const pathsToDelete = [mainPath, thumbPath].filter(Boolean) as string[];

        // Delete from storage
        if (pathsToDelete.length > 0) {
          await supabase.storage.from("gmb-media").remove(pathsToDelete);
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from("gmb_media")
          .delete()
          .eq("id", mediaId)
          .eq("user_id", user.id);

        if (dbError) {
          results.push({
            id: mediaId,
            success: false,
            error: "Failed to delete media record",
          });
          failed++;
        } else {
          results.push({
            id: mediaId,
            success: true,
          });
          deleted++;
        }
      } catch (error: any) {
        results.push({
          id: mediaId,
          success: false,
          error: error?.message || "Deletion failed",
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: deleted > 0,
      deleted,
      failed,
      total: mediaIds.length,
      results,
    });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Bulk delete failed",
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
