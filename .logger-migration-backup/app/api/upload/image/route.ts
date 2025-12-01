import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 400;
const MAX_IMAGE_DIMENSION = 2048;
const STORAGE_BUCKET = "gmb-media";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface UploadContext {
  supabase: SupabaseServerClient;
  userId: string;
  locationId?: string;
}

interface MediaMetadata {
  fileSize: number;
  originalSize: number;
  fileType: string;
  fileName: string;
  width?: number;
  height?: number;
  optimized: boolean;
  thumbnailGenerated: boolean;
  uploadedAt: string;
}

interface UploadPaths {
  objectPath: string;
  thumbnailPath: string;
  isVideo: boolean;
}

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

    const { file, locationId, error } = await extractRequestPayload(
      await request.formData(),
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const context: UploadContext = {
      supabase,
      userId: user.id,
      locationId: locationId ?? undefined,
    };

    const result = await processSingleUpload(file!, context);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 500 },
      );
    }

    return NextResponse.json(result.body);
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 },
    );
  }
}

async function extractRequestPayload(formData: FormData): Promise<{
  file?: File;
  locationId?: string;
  error?: string;
}> {
  const file = formData.get("file");
  const locationId = formData.get("locationId");

  if (!(file instanceof File)) {
    return { error: "No file provided" };
  }

  if (file.size > MAX_SIZE) {
    return { error: "File too large (max 10MB)" };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Invalid file type" };
  }

  return {
    file,
    locationId: typeof locationId === "string" ? locationId : undefined,
  };
}

async function processSingleUpload(file: File, context: UploadContext) {
  try {
    const paths = buildUploadPaths(file, context);
    let buffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
    let metadata = buildBaseMetadata(file);
    let thumbnailUrl: string | undefined;

    if (!paths.isVideo) {
      const processed = await processImageAsset({
        buffer,
        paths,
        metadata,
        supabase: context.supabase,
      });
      buffer = processed.buffer;
      metadata = processed.metadata;
      thumbnailUrl = processed.thumbnailUrl;
    }

    const primaryUpload = await uploadPrimaryAsset({
      supabase: context.supabase,
      objectPath: paths.objectPath,
      buffer,
      contentType: file.type,
    });

    if (!primaryUpload.success || !primaryUpload.publicUrl) {
      return {
        success: false as const,
        error: primaryUpload.error || "Upload failed",
        status: 500,
      };
    }

    const effectiveThumbnail =
      thumbnailUrl ?? (!paths.isVideo ? primaryUpload.publicUrl : undefined);

    if (context.locationId) {
      await persistMediaRecord(context, {
        locationId: context.locationId,
        metadata,
        isVideo: paths.isVideo,
        fileUrl: primaryUpload.publicUrl,
        thumbnailUrl: effectiveThumbnail,
      });
    }

    return {
      success: true as const,
      body: {
        url: primaryUpload.publicUrl,
        thumbnailUrl: effectiveThumbnail ?? null,
        path: paths.objectPath,
        metadata,
        success: true,
      },
    };
  } catch (error: any) {
    console.error("Single upload error:", error);
    return {
      success: false as const,
      error: error?.message || "Upload failed",
      status: 500,
    };
  }
}

function buildUploadPaths(file: File, context: UploadContext): UploadPaths {
  const isVideo = file.type.startsWith("video/");
  const inferredExtension = file.name.split(".").pop();
  const fallbackExtension = isVideo ? "mp4" : "jpg";
  const ext = (inferredExtension || fallbackExtension).toLowerCase();
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const basePath = context.locationId
    ? `${context.userId}/${context.locationId}`
    : `${context.userId}/general`;

  return {
    objectPath: `${basePath}/${uniqueSuffix}.${ext}`,
    thumbnailPath: `${basePath}/${uniqueSuffix}_thumb.webp`,
    isVideo,
  };
}

function buildBaseMetadata(file: File): MediaMetadata {
  return {
    fileSize: file.size,
    originalSize: file.size,
    fileType: file.type,
    fileName: file.name,
    optimized: false,
    thumbnailGenerated: false,
    uploadedAt: new Date().toISOString(),
  };
}

async function processImageAsset(params: {
  buffer: Buffer;
  paths: UploadPaths;
  metadata: MediaMetadata;
  supabase: SupabaseServerClient;
}): Promise<{
  buffer: Buffer;
  metadata: MediaMetadata;
  thumbnailUrl?: string;
}> {
  const { buffer, paths, supabase } = params;
  const metadata = { ...params.metadata };
  let workingBuffer: Buffer = buffer;

  try {
    const imageMetadata = await sharp(buffer).metadata();

    if (imageMetadata.width) {
      metadata.width = imageMetadata.width;
    }
    if (imageMetadata.height) {
      metadata.height = imageMetadata.height;
    }

    if (
      (imageMetadata.width || 0) > MAX_IMAGE_DIMENSION ||
      (imageMetadata.height || 0) > MAX_IMAGE_DIMENSION
    ) {
      workingBuffer = await sharp(buffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      metadata.optimized = true;
      metadata.fileSize = workingBuffer.length;
    }

    const thumbnailBuffer = await sharp(workingBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();

    const { thumbnailUrl, generated } = await uploadThumbnail(
      supabase,
      paths.thumbnailPath,
      thumbnailBuffer,
    );

    if (generated) {
      metadata.thumbnailGenerated = true;
    }

    return {
      buffer: workingBuffer,
      metadata,
      thumbnailUrl,
    };
  } catch (error) {
    console.error("Sharp processing error:", error);
    return {
      buffer: workingBuffer,
      metadata,
    };
  }
}

async function uploadThumbnail(
  supabase: SupabaseServerClient,
  thumbnailPath: string,
  thumbnailBuffer: Buffer,
): Promise<{ thumbnailUrl?: string; generated: boolean }> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(thumbnailPath, thumbnailBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (error) {
    console.error("Thumbnail upload error:", error);
    return { generated: false };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(thumbnailPath);

  return {
    thumbnailUrl: publicUrl,
    generated: true,
  };
}

async function uploadPrimaryAsset(params: {
  supabase: SupabaseServerClient;
  objectPath: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const { supabase, objectPath, buffer, contentType } = params;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("Primary upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);

  return {
    success: true,
    publicUrl,
  };
}

async function persistMediaRecord(
  context: UploadContext,
  params: {
    locationId: string;
    metadata: MediaMetadata;
    isVideo: boolean;
    fileUrl: string;
    thumbnailUrl?: string;
  },
) {
  const { error } = await context.supabase.from("gmb_media").insert({
    user_id: context.userId,
    location_id: params.locationId,
    url: params.fileUrl,
    type: params.isVideo ? "VIDEO" : "PHOTO",
    thumbnail_url: params.thumbnailUrl ?? null,
    metadata: params.metadata,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Database insert error:", error);
  }
}
