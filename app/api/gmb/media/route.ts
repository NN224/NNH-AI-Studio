import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { getValidAccessToken, GMB_CONSTANTS } from "@/lib/gmb/helpers"

export const dynamic = "force-dynamic"

const GMB_MEDIA_BASE = GMB_CONSTANTS.GMB_V4_BASE

function normalizeAccountId(accountId: string): string {
  return accountId.replace(/^accounts\//, "")
}

function normalizeLocationId(locationId: string): string {
  return locationId.replace(/^(accounts\/[^/]+\/)?locations\//, "")
}

function buildMediaEndpoint(accountId: string, locationId: string): string {
  const accountSegment = normalizeAccountId(accountId)
  const locationSegment = normalizeLocationId(locationId)
  return `${GMB_MEDIA_BASE}/accounts/${accountSegment}/locations/${locationSegment}/media`
}

async function fetchMediaFromGoogle(
  accessToken: string,
  accountId: string,
  locationId: string
): Promise<any[]> {
  const endpoint = buildMediaEndpoint(accountId, locationId)

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    let errorData: any = {}

    try {
      errorData = errorText ? JSON.parse(errorText) : {}
    } catch {
      errorData = { message: errorText }
    }

    const error = new Error(
      errorData.error?.message || errorData.message || "Failed to fetch media from Google"
    ) as Error & { status?: number; details?: any }
    error.status = response.status
    error.details = errorData
    throw error
  }

  const data = await response.json()
  const mediaItems = Array.isArray(data.mediaItems) ? data.mediaItems : []

  return mediaItems.map((item: any) => ({
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
  }))
}

async function fetchMediaFromDatabasePosts(
  supabase: any,
  locationId: string
): Promise<any[]> {
  try {
    const { data: posts, error } = await supabase
      .from("gmb_posts")
      .select("id, media_url, created_at, title, content")
      .eq("location_id", locationId)
      .not("media_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[Media API] Error fetching posts from database:", error)
      return []
    }

    if (!posts || posts.length === 0) {
      return []
    }

    return posts
      .filter((post: any) => Boolean(post.media_url))
      .map((post: any) => {
        const isPhoto = /\.(jpg|jpeg|png|gif|webp)$/i.test(post.media_url)

        return {
          id: `db_post_${post.id}`,
          name: post.id,
          sourceUrl: post.media_url,
          googleUrl: post.media_url,
          mediaFormat: isPhoto ? "PHOTO" : "VIDEO",
          createTime: post.created_at || null,
          updateTime: post.created_at || null,
          postTitle: post.title || post.content || null,
          postName: post.id,
          fromDatabase: true,
        }
      })
  } catch (error: any) {
    console.error("[Media API] Error processing database posts:", error?.message)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const locationId = searchParams.get("locationId") || undefined

    let locationsQuery = supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_id,
        gmb_account_id,
        gmb_accounts!inner(id, account_id, is_active)
      `
      )
      .eq("user_id", user.id)

    if (locationId) {
      locationsQuery = locationsQuery.eq("id", locationId)
    }

    const { data: locations, error: locationsError } = await locationsQuery

    if (locationsError) {
      console.error("[Media API] Failed to load locations:", locationsError)
      return errorResponse("DATABASE_ERROR", "Failed to load locations", 500, locationsError)
    }

    if (!locations || locations.length === 0) {
      return successResponse({
        media: [],
        total: 0,
        warnings: [],
        message: "No locations found for current user",
      })
    }

    const mediaResults: any[] = []
    const warnings: Array<{ locationId: string; message: string; status?: number }> = []

    for (const location of locations) {
      const account =
        (Array.isArray(location.gmb_accounts) ? location.gmb_accounts[0] : location.gmb_accounts) ||
        null

      if (!location.gmb_account_id || !account?.account_id) {
        warnings.push({
          locationId: location.id,
          message: "Location is missing linked Google account. Skipping.",
        })
        continue
      }

      if (account.is_active === false) {
        warnings.push({
          locationId: location.id,
          message: "Linked Google account is inactive. Skipping.",
        })
        continue
      }

      let googleMedia: any[] = []

      try {
        const accessToken = await getValidAccessToken(supabase, location.gmb_account_id)
        googleMedia = await fetchMediaFromGoogle(accessToken, account.account_id, location.location_id)
      } catch (error: any) {
        console.error("[Media API] Google fetch error:", {
          message: error?.message,
          status: error?.status,
          details: error?.details,
          locationId: location.id,
        })
        warnings.push({
          locationId: location.id,
          message: error?.message || "Failed to fetch media from Google",
          status: error?.status,
        })
      }

      if (googleMedia.length === 0) {
        const fallbackMedia = await fetchMediaFromDatabasePosts(supabase, location.id)
        googleMedia = fallbackMedia
      }

      googleMedia.forEach((item) => {
        mediaResults.push({
          ...item,
          location_id: location.id,
          location_resource: location.location_id,
        })
      })
    }

    return successResponse({
      media: mediaResults,
      total: mediaResults.length,
      warnings,
    })
  } catch (error: any) {
    console.error("[Media API] Error:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      error,
    })
    return errorResponse("INTERNAL_ERROR", error?.message || "Failed to fetch media", 500)
  }
}

