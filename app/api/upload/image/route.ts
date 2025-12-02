import { sanitizeFileName } from "@/lib/security/input-sanitizer";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 400;
const MAX_IMAGE_DIMENSION = 2048;
const STORAGE_BUCKET = "gmb-media";
const MAX_FILES_PER_USER = 1000; // Maximum files per user
const MAX_STORAGE_PER_USER = 1024 * 1024 * 1024; // 1GB per user

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

// Magic bytes for file type verification
const FILE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "video/mp4": [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
};

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

/**
 * Verify file type by checking magic bytes
 */
function verifyFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];
  if (!signatures) return false;

  // Check if buffer starts with expected magic bytes
  for (let i = 0; i < signatures.length; i++) {
    if (buffer[i] !== signatures[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Check user storage quota
 */
async function checkUserQuota(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Count existing files
    const { count, error: countError } = await supabase
      .from("gmb_media")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      apiLogger.error("Error checking user quota", countError);
      return { allowed: true }; // Fail open for now
    }

    if (count && count >= MAX_FILES_PER_USER) {
      return {
        allowed: false,
        error: `Storage limit reached (${MAX_FILES_PER_USER} files maximum)`,
      };
    }

    return { allowed: true };
  } catch (error) {
    apiLogger.error(
      "Quota check error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { allowed: true }; // Fail open
  }
}

async function uploadHandler(request: NextRequest) {
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
  } catch (error) {
    apiLogger.error(
      "Upload error",
      error instanceof Error ? error : new Error(String(error)),
      {
        requestId: request.headers.get("x-request-id") || undefined,
      },
    );
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
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
    // Check user quota first
    const quotaCheck = await checkUserQuota(context.supabase, context.userId);
    if (!quotaCheck.allowed) {
      return {
        success: false as const,
        error: quotaCheck.error || "Storage quota exceeded",
        status: 403,
      };
    }

    const paths = buildUploadPaths(file, context);
    let buffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer;

    // Verify file signature matches claimed type
    if (!verifyFileSignature(buffer, file.type)) {
      return {
        success: false as const,
        error: "File content does not match file type",
        status: 400,
      };
    }

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
    apiLogger.error(
      "Single upload error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: context.locationId, userId: context.userId },
    );
    return {
      success: false as const,
      error: error?.message || "Upload failed",
      status: 500,
    };
  }
}

function buildUploadPaths(file: File, context: UploadContext): UploadPaths {
  const isVideo = file.type.startsWith("video/");

  // Sanitize filename to prevent path traversal
  const sanitizedName = sanitizeFileName(file.name);
  const inferredExtension = sanitizedName.split(".").pop();
  const fallbackExtension = isVideo ? "mp4" : "jpg";

  // Whitelist allowed extensions
  const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "mp4",
    "webm",
  ];
  let ext = (inferredExtension || fallbackExtension).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    ext = fallbackExtension;
  }

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
    apiLogger.error(
      "Sharp processing error",
      error instanceof Error ? error : new Error(String(error)),
    );
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
    apiLogger.error(
      "Thumbnail upload error",
      error instanceof Error ? error : new Error(String(error)),
      { path: thumbnailPath },
    );
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
    apiLogger.error(
      "Primary upload error",
      error instanceof Error ? error : new Error(String(error)),
      { path: objectPath },
    );
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
    apiLogger.error(
      "Database insert error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
  }
}

// Apply CSRF protection and rate limiting
export const POST = withCSRF(
  withRateLimit(uploadHandler, {
    limit: 20, // 20 uploads per minute
    window: 60,
    errorMessage: "Too many upload requests. Please wait before trying again.",
  }),
);
