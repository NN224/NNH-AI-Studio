import { GMB_CONSTANTS, getValidAccessToken } from "@/lib/gmb/helpers";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { gmbLogger } from "@/lib/utils/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

interface MediaItem {
  id: string;
  name: string;
  sourceUrl?: string;
  googleUrl?: string;
  mediaFormat: string;
  thumbnailUrl?: string;
  createTime?: string;
  updateTime?: string;
  locationAssociation?: unknown;
  metadata?: unknown;
  fromGoogle?: boolean;
  fromDatabase?: boolean;
  postTitle?: string | null;
  postName?: string;
  location_id?: string;
  location_resource?: string;
}

interface GoogleMediaItem {
  name?: string;
  sourceUrl?: string;
  googleUrl?: string;
  mediaFormat?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  createTime?: string;
  updateTime?: string;
  locationAssociation?: unknown;
}

interface DatabasePost {
  id: string;
  media_url: string | null;
  created_at: string | null;
  title: string | null;
  content: string | null;
}

export const dynamic = "force-dynamic";

const GMB_MEDIA_BASE = GMB_CONSTANTS.GMB_V4_BASE;

function normalizeAccountId(accountId: string): string {
  return accountId.replace(/^accounts\//, "");
}

function normalizeLocationId(locationId: string): string {
  return locationId.replace(/^(accounts\/[^/]+\/)?locations\//, "");
}

function buildMediaEndpoint(accountId: string, locationId: string): string {
  const accountSegment = normalizeAccountId(accountId);
  const locationSegment = normalizeLocationId(locationId);
  return `${GMB_MEDIA_BASE}/accounts/${accountSegment}/locations/${locationSegment}/media`;
}

async function fetchMediaFromGoogle(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<MediaItem[]> {
  const endpoint = buildMediaEndpoint(accountId, locationId);

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorData: { error?: { message?: string }; message?: string } = {};

    try {
      errorData = errorText ? JSON.parse(errorText) : {};
    } catch {
      errorData = { message: errorText };
    }

    const error = new Error(
      errorData.error?.message ||
        errorData.message ||
        "Failed to fetch media from Google",
    ) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    error.details = errorData;
    throw error;
  }

  const data = await response.json();
  const mediaItems = Array.isArray(data.mediaItems) ? data.mediaItems : [];

  return mediaItems.map((item: GoogleMediaItem) => ({
    id: item.name?.split("/").pop() || item.name,
    name: item.name,
    sourceUrl: item.sourceUrl || item.googleUrl,
    googleUrl: item.googleUrl || item.sourceUrl,
    mediaFormat: item.mediaFormat || item.mediaType || "PHOTO",
    thumbnailUrl: item.thumbnailUrl,
    createTime: item.createTime,
    updateTime: item.updateTime,
    locationAssociation: item.locationAssociation,
    metadata: item,
    fromGoogle: true,
  }));
}

async function fetchMediaFromDatabasePosts(
  supabase: SupabaseClient,
  locationId: string,
): Promise<MediaItem[]> {
  try {
    const { data: posts, error } = await supabase
      .from("gmb_posts")
      .select("id, media_url, created_at, title, content")
      .eq("location_id", locationId)
      .not("media_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      gmbLogger.error(
        "[Media API] Error fetching posts from database",
        error instanceof Error ? error : new Error(String(error)),
        { locationId },
      );
      return [];
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    return posts
      .filter((post: DatabasePost) => Boolean(post.media_url))
      .map((post: DatabasePost) => {
        const mediaUrl = post.media_url || "";
        const isPhoto = /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl);

        return {
          id: `db_post_${post.id}`,
          name: post.id,
          sourceUrl: mediaUrl || undefined,
          googleUrl: mediaUrl || undefined,
          mediaFormat: isPhoto ? "PHOTO" : "VIDEO",
          createTime: post.created_at || undefined,
          updateTime: post.created_at || undefined,
          postTitle: post.title || post.content || null,
          postName: post.id,
          fromDatabase: true,
        };
      });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    gmbLogger.error("[Media API] Error processing database posts", err, {
      locationId,
    });
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId") || undefined;

    let locationsQuery = supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_id,
        gmb_account_id,
        gmb_accounts!inner(id, account_id, is_active)
      `,
      )
      .eq("user_id", user.id);

    if (locationId) {
      locationsQuery = locationsQuery.eq("id", locationId);
    }

    const { data: locations, error: locationsError } = await locationsQuery;

    if (locationsError) {
      gmbLogger.error(
        "[Media API] Failed to load locations",
        locationsError instanceof Error
          ? locationsError
          : new Error(String(locationsError)),
        { userId: user.id },
      );
      return errorResponse(
        "DATABASE_ERROR",
        "Failed to load locations",
        500,
        locationsError,
      );
    }

    if (!locations || locations.length === 0) {
      return successResponse({
        media: [],
        total: 0,
        warnings: [],
        message: "No locations found for current user",
      });
    }

    const mediaResults: MediaItem[] = [];
    const warnings: Array<{
      locationId: string;
      message: string;
      status?: number;
    }> = [];

    for (const location of locations) {
      const account =
        (Array.isArray(location.gmb_accounts)
          ? location.gmb_accounts[0]
          : location.gmb_accounts) || null;

      if (!location.gmb_account_id || !account?.account_id) {
        warnings.push({
          locationId: location.id,
          message: "Location is missing linked Google account. Skipping.",
        });
        continue;
      }

      if (account.is_active === false) {
        warnings.push({
          locationId: location.id,
          message: "Linked Google account is inactive. Skipping.",
        });
        continue;
      }

      let googleMedia: MediaItem[] = [];

      try {
        const accessToken = await getValidAccessToken(
          supabase,
          location.gmb_account_id,
        );
        googleMedia = await fetchMediaFromGoogle(
          accessToken,
          account.account_id,
          location.location_id,
        );
      } catch (error: unknown) {
        const err = error as Error & { status?: number; details?: unknown };
        gmbLogger.error(
          "[Media API] Google fetch error",
          err instanceof Error ? err : new Error(String(err)),
          {
            message: err?.message,
            status: err?.status,
            details: err?.details,
            locationId: location.id,
            accountId: account.account_id,
          },
        );
        warnings.push({
          locationId: location.id,
          message: err?.message || "Failed to fetch media from Google",
          status: err?.status,
        });
      }

      if (googleMedia.length === 0) {
        const fallbackMedia = await fetchMediaFromDatabasePosts(
          supabase,
          location.id,
        );
        googleMedia = fallbackMedia;
      }

      googleMedia.forEach((item) => {
        mediaResults.push({
          ...item,
          location_id: location.id,
          location_resource: location.location_id,
        });
      });
    }

    return successResponse({
      media: mediaResults,
      total: mediaResults.length,
      warnings,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    gmbLogger.error("[Media API] Error", err);
    return errorResponse(
      "INTERNAL_ERROR",
      err.message || "Failed to fetch media",
      500,
    );
  }
}
