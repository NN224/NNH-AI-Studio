import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "gmb-media";
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

type BrandingVariant = "cover" | "logo";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const locationId = params.id;

  if (!locationId) {
    return NextResponse.json(
      { error: "Location id is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const variantEntry =
      (formData.get("variant") as BrandingVariant | null) ?? "cover";

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (fileEntry.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 8MB." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME.has(fileEntry.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 },
      );
    }

    const variant: BrandingVariant = variantEntry === "logo" ? "logo" : "cover";

    const buffer = Buffer.from(await fileEntry.arrayBuffer()) as Buffer;
    const processed = await transformImage(buffer, variant);

    const objectPath = buildStoragePath(user.id, locationId, variant);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, processed.buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      apiLogger.error(
        "[Branding Upload] Upload failed",
        uploadError instanceof Error
          ? uploadError
          : new Error(String(uploadError)),
        { locationId, userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);

    const { data: locationRow, error: locationError } = await supabase
      .from("gmb_locations")
      .select("metadata, cover_photo_url, user_id")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (locationError) {
      apiLogger.error(
        "[Branding Upload] Failed to fetch location",
        locationError instanceof Error
          ? locationError
          : new Error(String(locationError)),
        { locationId, userId: user.id },
      );
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const metadata = normalizeMetadata(locationRow?.metadata);
    const branding = { ...(metadata.customBranding ?? {}) };

    if (variant === "cover") {
      branding.coverImageUrl = publicUrl;
    } else {
      branding.logoImageUrl = publicUrl;
    }

    metadata.customBranding = branding;

    const updatePayload: Record<string, any> = {
      metadata,
    };

    if (variant === "cover") {
      updatePayload.cover_photo_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("gmb_locations")
      .update(updatePayload)
      .eq("id", locationId)
      .eq("user_id", user.id);

    if (updateError) {
      apiLogger.error(
        "[Branding Upload] Failed to update metadata",
        updateError instanceof Error
          ? updateError
          : new Error(String(updateError)),
        { locationId, userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to persist branding image" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, url: publicUrl, variant });
  } catch (error: any) {
    apiLogger.error(
      "[Branding Upload] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId },
    );
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

function buildStoragePath(
  userId: string,
  locationId: string,
  variant: BrandingVariant,
) {
  const uniqueSuffix = `${variant}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${locationId}/branding/${uniqueSuffix}.webp`;
}

function normalizeMetadata(metadata: unknown): Record<string, any> {
  if (!metadata) return {};

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) ?? {};
    } catch (error) {
      apiLogger.warn("[Branding Upload] Failed to parse metadata string", {
        error: String(error),
      });
      return {};
    }
  }

  if (typeof metadata === "object") {
    return { ...(metadata as Record<string, any>) };
  }

  return {};
}

async function transformImage(buffer: Buffer, variant: BrandingVariant) {
  const worker = sharp(buffer);

  if (variant === "logo") {
    return {
      buffer: await worker
        .resize(512, 512, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 90 })
        .toBuffer(),
    };
  }

  return {
    buffer: await worker
      .resize(1600, 900, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 86 })
      .toBuffer(),
  };
}
