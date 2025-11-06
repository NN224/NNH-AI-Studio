"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const GMB_API_BASE = "https://mybusiness.googleapis.com/v4"

// Validation schemas
const ReplyToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  replyText: z.string().min(1).max(4000),
})

/**
 * Get valid access token for a GMB account
 * Refreshes if expired
 */
async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  const { data: account, error } = await supabase
    .from("gmb_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("id", accountId)
    .single()

  if (error || !account) {
    throw new Error("GMB account not found or inaccessible")
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now()
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0

  if (expiresAt > now + 5 * 60 * 1000) {
    return account.access_token
  }

  // Token expired, refresh it
  console.log("[GMB Reviews] Refreshing access token...")

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Failed to refresh token: ${errorData.error || "Unknown error"}. Please reconnect your Google account.`
    )
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  // Update token in database
  await supabase
    .from("gmb_accounts")
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq("id", accountId)

  return tokens.access_token
}

/**
 * Reply to a Google review
 */
export async function replyToReview(reviewId: string, replyText: string) {
  try {
    // Validate input
    const validatedData = ReplyToReviewSchema.parse({ reviewId, replyText })

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated. Please log in.",
      }
    }

    // Get review details with location and account info
    const { data: review, error: fetchError } = await supabase
      .from("gmb_reviews")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          gmb_accounts!inner(
            id,
            account_id,
            access_token,
            refresh_token,
            expires_at
          )
        )
      `
      )
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !review) {
      return {
        success: false,
        error: "Review not found or you don't have permission to reply to it.",
      }
    }

    // Check if already replied
    if (review.has_reply) {
      return {
        success: false,
        error: "This review already has a reply.",
      }
    }

    const location = review.gmb_locations
    const account = Array.isArray(location.gmb_accounts)
      ? location.gmb_accounts[0]
      : location.gmb_accounts

    if (!account) {
      return {
        success: false,
        error: "GMB account not found. Please reconnect your Google account.",
      }
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, account.id)

    // Call Google My Business API to post reply
    // Using accounts.locations.reviews.updateReply endpoint
    const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/reviews/${review.external_review_id}/reply`

    const response = await fetch(gmbApiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: validatedData.replyText,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return {
          success: false,
          error:
            "Authentication expired. Please reconnect your Google account in Settings.",
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please try again in a few minutes.",
        }
      }

      console.error("[GMB Reviews] API error:", errorData)
      return {
        success: false,
        error:
          errorData.error?.message ||
          "Failed to post reply to Google. Please try again.",
      }
    }

    const result = await response.json()

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_reviews")
      .update({
        response: validatedData.replyText,
        reply_date: new Date().toISOString(),
        has_reply: true,
        status: "responded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validatedData.reviewId)

    if (updateError) {
      console.error("[GMB Reviews] Database update error:", updateError)
      // Don't fail the request since the reply was posted to Google
      // Log for monitoring
    }

    // Revalidate relevant pages
    revalidatePath("/dashboard")
    revalidatePath("/reviews")
    revalidatePath(`/[locale]/(dashboard)`)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error("[GMB Reviews] Error replying to review:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      }
    }

    return {
      success: false,
      error: error.message || "An unexpected error occurred. Please try again.",
    }
  }
}

/**
 * Get pending reviews (reviews without replies)
 */
export async function getPendingReviews(locationId?: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
      }
    }

    let query = supabase
      .from("gmb_reviews")
      .select(
        `
        id,
        rating,
        review_text,
        reviewer_name,
        reviewer_profile_photo_url,
        review_date,
        created_at,
        gmb_locations!inner(
          id,
          location_name
        )
      `
      )
      .eq("user_id", user.id)
      .eq("has_reply", false)
      .order("review_date", { ascending: false })
      .limit(50)

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[GMB Reviews] Error fetching pending reviews:", error)
      return {
        success: false,
        error: error.message,
        data: [],
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error: any) {
    console.error("[GMB Reviews] Error in getPendingReviews:", error)
    return {
      success: false,
      error: error.message || "Failed to fetch pending reviews",
      data: [],
    }
  }
}

/**
 * Sync reviews from Google My Business API
 */
export async function syncReviews(locationId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    // Get location details
    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_id,
        gmb_account_id,
        gmb_accounts!inner(
          id,
          account_id,
          access_token,
          refresh_token,
          expires_at
        )
      `
      )
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single()

    if (locError || !location) {
      return {
        success: false,
        error: "Location not found or you don't have permission to sync it.",
      }
    }

    const account = Array.isArray(location.gmb_accounts)
      ? location.gmb_accounts[0]
      : location.gmb_accounts

    if (!account) {
      return {
        success: false,
        error: "GMB account not found. Please reconnect your Google account.",
      }
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, account.id)

    // Fetch reviews from Google
    const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/reviews`

    const response = await fetch(gmbApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication expired. Please reconnect your Google account.",
        }
      }

      const errorData = await response.json().catch(() => ({}))
      console.error("[GMB Reviews] Sync API error:", errorData)
      return {
        success: false,
        error: "Failed to sync reviews from Google",
      }
    }

    const { reviews = [] } = await response.json()

    // Upsert reviews to database
    if (reviews.length > 0) {
      const reviewsToUpsert = reviews.map((r: any) => ({
        user_id: user.id,
        location_id: locationId,
        gmb_account_id: account.id,
        external_review_id: r.reviewId || r.name?.split("/").pop(),
        rating: r.starRating === "FIVE" ? 5 : r.starRating === "FOUR" ? 4 : r.starRating === "THREE" ? 3 : r.starRating === "TWO" ? 2 : 1,
        review_text: r.comment || null,
        reviewer_name: r.reviewer?.displayName || "Anonymous",
        reviewer_profile_photo_url: r.reviewer?.profilePhotoUrl || null,
        review_date: r.createTime || new Date().toISOString(),
        response: r.reviewReply?.comment || null,
        reply_date: r.reviewReply?.updateTime || null,
        has_reply: !!r.reviewReply,
        status: r.reviewReply ? "responded" : "pending",
      }))

      const { error: upsertError } = await supabase
        .from("gmb_reviews")
        .upsert(reviewsToUpsert, {
          onConflict: "external_review_id",
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error("[GMB Reviews] Upsert error:", upsertError)
        return {
          success: false,
          error: "Failed to save reviews to database",
        }
      }
    }

    // Update last_synced_at
    await supabase
      .from("gmb_locations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", locationId)

    revalidatePath("/dashboard")
    revalidatePath("/reviews")

    return {
      success: true,
      syncedCount: reviews.length,
    }
  } catch (error: any) {
    console.error("[GMB Reviews] Sync error:", error)
    return {
      success: false,
      error: error.message || "Failed to sync reviews",
    }
  }
}

