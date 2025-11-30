"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Media Management Server Actions
 * Handles upload, deletion, and metadata management for media files
 */

interface MediaMetadata {
  fileSize: number;
  fileType: string;
  fileName: string;
  width?: number;
  height?: number;
  duration?: number;
  uploadedAt: string;
}

interface UploadMediaResult {
  success: boolean;
  error?: string;
  media?: {
    id: string;
    url: string;
    thumbnail_url?: string;
    metadata: MediaMetadata;
  };
}

interface BulkUploadResult {
  success: boolean;
  uploaded: number;
  failed: number;
  results: Array<{
    fileName: string;
    success: boolean;
    url?: string;
    error?: string;
  }>;
}

/**
 * Upload a single media file to Supabase storage and save metadata to database
 */
export async function uploadMedia(
  formData: FormData,
  locationId: string,
): Promise<UploadMediaResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File too large (max 10MB)" };
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Invalid file type" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const fileName = `${user.id}/${locationId}/${timestamp}.${ext}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("gmb-media")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("gmb-media").getPublicUrl(fileName);

    // Determine media type
    const isVideo = file.type.startsWith("video/");
    const mediaType = isVideo ? "VIDEO" : "PHOTO";

    // Prepare metadata
    const metadata: MediaMetadata = {
      fileSize: file.size,
      fileType: file.type,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    };

    // Save to database
    const { data: mediaRecord, error: dbError } = await supabase
      .from("gmb_media")
      .insert({
        user_id: user.id,
        location_id: locationId,
        url: publicUrl,
        type: mediaType,
        thumbnail_url: isVideo ? null : publicUrl,
        metadata: metadata,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up uploaded file
      await supabase.storage.from("gmb-media").remove([fileName]);
      return { success: false, error: "Failed to save media metadata" };
    }

    revalidatePath("/[locale]/(dashboard)/media", "page");

    return {
      success: true,
      media: {
        id: mediaRecord.id,
        url: publicUrl,
        thumbnail_url: isVideo ? undefined : publicUrl,
        metadata,
      },
    };
  } catch (error: unknown) {
    console.error("Upload media error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload multiple media files (bulk upload)
 */
export async function bulkUploadMedia(
  files: Array<{ file: File; locationId: string }>,
): Promise<BulkUploadResult> {
  const results: Array<{
    fileName: string;
    success: boolean;
    url?: string;
    error?: string;
  }> = [];

  let uploaded = 0;
  let failed = 0;

  for (const { file, locationId } of files) {
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadMedia(formData, locationId);

    if (result.success && result.media) {
      uploaded++;
      results.push({
        fileName: file.name,
        success: true,
        url: result.media.url,
      });
    } else {
      failed++;
      results.push({
        fileName: file.name,
        success: false,
        error: result.error,
      });
    }
  }

  return {
    success: uploaded > 0,
    uploaded,
    failed,
    results,
  };
}

/**
 * Delete a media file from storage and database
 */
export async function deleteMedia(
  mediaId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get media record to find storage path
    const { data: media, error: fetchError } = await supabase
      .from("gmb_media")
      .select("*")
      .eq("id", mediaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !media) {
      return { success: false, error: "Media not found" };
    }

    // Extract file path from URL
    const urlParts = media.url.split("/gmb-media/");
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    // Delete from storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from("gmb-media")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("gmb_media")
      .delete()
      .eq("id", mediaId)
      .eq("user_id", user.id);

    if (dbError) {
      console.error("Database deletion error:", dbError);
      return { success: false, error: "Failed to delete media record" };
    }

    revalidatePath("/[locale]/(dashboard)/media", "page");

    return { success: true };
  } catch (error: unknown) {
    console.error("Delete media error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deletion failed",
    };
  }
}

/**
 * Delete multiple media files (bulk delete)
 */
export async function bulkDeleteMedia(
  mediaIds: string[],
): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  error?: string;
}> {
  let deleted = 0;
  let failed = 0;

  for (const mediaId of mediaIds) {
    const result = await deleteMedia(mediaId);
    if (result.success) {
      deleted++;
    } else {
      failed++;
    }
  }

  return {
    success: deleted > 0,
    deleted,
    failed,
  };
}

/**
 * Get media statistics for user
 */
export async function getMediaStats(): Promise<{
  success: boolean;
  stats?: {
    totalPhotos: number;
    totalVideos: number;
    totalSize: number;
    totalSizeFormatted: string;
    locationsWithMedia: number;
    totalMedia: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: media, error } = await supabase
      .from("gmb_media")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Stats fetch error:", error);
      return { success: false, error: "Failed to fetch media stats" };
    }

    const mediaArray = media || [];
    const photos = mediaArray.filter(
      (m) => m.type === "PHOTO" || m.type === "photo",
    );
    const videos = mediaArray.filter(
      (m) => m.type === "VIDEO" || m.type === "video",
    );

    const totalBytes = mediaArray.reduce((sum, m) => {
      if (
        m.metadata &&
        typeof m.metadata === "object" &&
        "fileSize" in m.metadata
      ) {
        return sum + (Number(m.metadata.fileSize) || 0);
      }
      return sum;
    }, 0);

    const totalSizeFormatted =
      totalBytes > 1024 * 1024 * 1024
        ? `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : totalBytes > 1024 * 1024
          ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
          : `${(totalBytes / 1024).toFixed(2)} KB`;

    const uniqueLocations = new Set(
      mediaArray.map((m) => m.location_id).filter(Boolean),
    );

    return {
      success: true,
      stats: {
        totalPhotos: photos.length,
        totalVideos: videos.length,
        totalSize: totalBytes,
        totalSizeFormatted,
        locationsWithMedia: uniqueLocations.size,
        totalMedia: mediaArray.length,
      },
    };
  } catch (error: unknown) {
    console.error("Get media stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get stats",
    };
  }
}

/**
 * Update media metadata
 */
export async function updateMediaMetadata(
  mediaId: string,
  metadata: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
      .from("gmb_media")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", mediaId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Metadata update error:", updateError);
      return { success: false, error: "Failed to update metadata" };
    }

    revalidatePath("/[locale]/(dashboard)/media", "page");

    return { success: true };
  } catch (error: unknown) {
    console.error("Update metadata error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}
