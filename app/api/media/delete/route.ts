import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await request.json();

  if (!mediaId) {
    return NextResponse.json(
      { error: "Media ID is required" },
      { status: 400 },
    );
  }

  // First, get the media record to find the file path
  const { data: mediaRecord, error: fetchError } = await supabase
    .from("gmb_media")
    .select("url")
    .eq("id", mediaId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !mediaRecord) {
    return NextResponse.json(
      { error: "Media not found or permission denied" },
      { status: 404 },
    );
  }

  // Extract file path from URL
  const filePath = mediaRecord.url.substring(
    mediaRecord.url.lastIndexOf("/media/") + 7,
  );

  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from("media")
    .remove([filePath]);

  if (storageError) {
    // Log the error but proceed to delete from DB anyway
    apiLogger.error(
      "Storage deletion failed",
      storageError instanceof Error
        ? storageError
        : new Error(String(storageError)),
      { mediaId, userId: user.id },
    );
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("gmb_media")
    .delete()
    .eq("id", mediaId);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to delete media record from database" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
