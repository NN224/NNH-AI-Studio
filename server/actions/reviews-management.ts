"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  buildLocationResourceName,
  getValidAccessToken,
  GMB_CONSTANTS,
} from "@/lib/gmb/helpers"

const GMB_API_BASE = GMB_CONSTANTS.GMB_V4_BASE

// Validation schemas
const ReplySchema = z.object({
  reviewId: z.string().uuid(),
  replyText: z.string().min(1).max(4096, "Reply must be less than 4096 characters"),
})

const FilterSchema = z.object({
  locationId: z.string().uuid().optional(),
  rating: z.number().min(1).max(5).optional(),
  hasReply: z.boolean().optional(),
  status: z.enum(['pending', 'replied', 'responded', 'flagged', 'archived']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  searchQuery: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
})

/**
 * 1. GET REVIEWS WITH ADVANCED FILTERING
 */
export async function getReviews(params: z.infer<typeof FilterSchema>) {
  try {
    const validatedParams = FilterSchema.parse(params)
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
        count: 0,
      }
    }

    // Build query with location join
    let query = supabase
      .from("gmb_reviews")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_name,
          address
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id)

    // Apply filters
    if (validatedParams.locationId) {
      query = query.eq("location_id", validatedParams.locationId)
    }

    if (validatedParams.rating) {
      query = query.eq("rating", validatedParams.rating)
    }

    if (validatedParams.hasReply !== undefined) {
      query = query.eq("has_reply", validatedParams.hasReply)
    }

    if (validatedParams.status) {
      query = query.eq("status", validatedParams.status)
    }

    if (validatedParams.sentiment) {
      query = query.eq("ai_sentiment", validatedParams.sentiment)
    }

    if (validatedParams.searchQuery) {
      query = query.or(
        `review_text.ilike.%${validatedParams.searchQuery}%,reviewer_name.ilike.%${validatedParams.searchQuery}%`
      )
    }

    // Apply sorting
    switch (validatedParams.sortBy) {
      case "newest":
        query = query.order("review_date", { ascending: false })
        break
      case "oldest":
        query = query.order("review_date", { ascending: true })
        break
      case "highest":
        query = query.order("rating", { ascending: false })
        break
      case "lowest":
        query = query.order("rating", { ascending: true })
        break
      default:
        query = query.order("review_date", { ascending: false })
    }

    // Apply pagination
    const limit = validatedParams.limit || 50
    const offset = validatedParams.offset || 0

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("[Reviews] Fetch error:", error)
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0,
      }
    }

    return {
      success: true,
      data: data || [],
      count: count || 0,
    }
  } catch (error: any) {
    console.error("[Reviews] Error:", error)
    return {
      success: false,
      error: error.message || "Failed to fetch reviews",
      data: [],
      count: 0,
    }
  }
}

/**
 * 2. REPLY TO REVIEW
 */
export async function replyToReview(reviewId: string, replyText: string) {
  try {
    const validatedData = ReplySchema.parse({ reviewId, replyText })
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get review with location and account details
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
        error: "Review not found or you don't have permission",
      }
    }

    if (review.has_reply) {
      return {
        success: false,
        error: "This review already has a reply. Use updateReply to modify it.",
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

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Call Google My Business API
    const endpoint = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/reviews/${review.external_review_id}:reply`

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: validatedData.replyText.trim(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication expired. Please reconnect your Google account.",
        }
      } else if (response.status === 403) {
        return {
          success: false,
          error: "Permission denied. Verify you have access to this location.",
        }
      } else if (response.status === 404) {
        return {
          success: false,
          error: "Review not found on Google. It may have been deleted.",
        }
      } else if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please try again in a few minutes.",
        }
      }

      console.error("[Reviews] API error:", errorData)
      return {
        success: false,
        error:
          errorData.error?.message ||
          `Failed to post reply (${response.status})`,
      }
    }

    const result = await response.json()

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_reviews")
      .update({
        response: validatedData.replyText.trim(),
        reply_date: new Date().toISOString(),
        responded_at: new Date().toISOString(),
        has_reply: true,
        status: "replied",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validatedData.reviewId)

    if (updateError) {
      console.error("[Reviews] Database update error:", updateError)
    }

    revalidatePath("/dashboard")
    revalidatePath("/reviews")

    return {
      success: true,
      data: result,
      message: "Reply posted successfully!",
    }
  } catch (error: any) {
    console.error("[Reviews] Reply error:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      }
    }

    return {
      success: false,
      error: error.message || "Failed to post reply",
    }
  }
}

/**
 * 3. UPDATE EXISTING REPLY
 */
export async function updateReply(reviewId: string, newReplyText: string) {
  try {
    const validatedData = ReplySchema.parse({ reviewId, replyText: newReplyText })
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get review
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
      return { success: false, error: "Review not found" }
    }

    if (!review.has_reply) {
      return {
        success: false,
        error: "No existing reply to update. Use replyToReview instead.",
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

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Call Google API to update reply
    const endpoint = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/reviews/${review.external_review_id}/reply`

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: validatedData.replyText.trim(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error:
          errorData.error?.message ||
          "Failed to update reply on Google",
      }
    }

    const result = await response.json()

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_reviews")
      .update({
        response: validatedData.replyText.trim(),
        reply_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", validatedData.reviewId)

    if (updateError) console.error("[Reviews] DB update error:", updateError)

    revalidatePath("/dashboard")
    revalidatePath("/reviews")

    return {
      success: true,
      data: result,
      message: "Reply updated successfully!",
    }
  } catch (error: any) {
    console.error("[Reviews] Update reply error:", error)
    return {
      success: false,
      error: error.message || "Failed to update reply",
    }
  }
}

/**
 * 4. DELETE REPLY
 */
export async function deleteReply(reviewId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get review
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
      .eq("id", reviewId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !review) {
      return { success: false, error: "Review not found" }
    }

    if (!review.has_reply) {
      return { success: false, error: "No reply to delete" }
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

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Call Google API to delete
    const endpoint = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/reviews/${review.external_review_id}/reply`

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // 404 is OK - means already deleted
    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to delete reply",
      }
    }

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_reviews")
      .update({
        response: null,
        reply_date: null,
        responded_at: null,
        has_reply: false,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)

    if (updateError) console.error("[Reviews] DB update error:", updateError)

    revalidatePath("/dashboard")
    revalidatePath("/reviews")

    return {
      success: true,
      message: "Reply deleted successfully!",
    }
  } catch (error: any) {
    console.error("[Reviews] Delete reply error:", error)
    return {
      success: false,
      error: error.message || "Failed to delete reply",
    }
  }
}

/**
 * 5. BULK REPLY TO MULTIPLE REVIEWS
 */
export async function bulkReplyToReviews(
  reviewIds: string[],
  replyTemplate: string
) {
  try {
    if (!reviewIds || reviewIds.length === 0) {
      return {
        success: false,
        error: "No reviews selected",
      }
    }

    if (reviewIds.length > 50) {
      return {
        success: false,
        error: "Cannot reply to more than 50 reviews at once",
      }
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    }

    // Reply to each review with delay
    for (const reviewId of reviewIds) {
      const result = await replyToReview(reviewId, replyTemplate)

      if (result.success) {
        results.success.push(reviewId)
      } else {
        results.failed.push({
          id: reviewId,
          error: result.error || "Unknown error",
        })
      }

      // 500ms delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return {
      success: true,
      data: results,
      message: `Replied to ${results.success.length} of ${reviewIds.length} reviews`,
    }
  } catch (error: any) {
    console.error("[Reviews] Bulk reply error:", error)
    return {
      success: false,
      error: error.message || "Failed to bulk reply",
    }
  }
}

/**
 * 6. FLAG REVIEW
 */
export async function flagReview(reviewId: string, reason: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
      .from("gmb_reviews")
      .update({
        status: "flagged",
        flagged_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("user_id", user.id)

    if (error) {
      console.error("[Reviews] Flag error:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/reviews")

    return {
      success: true,
      message: "Review flagged successfully",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to flag review",
    }
  }
}

/**
 * 7. SYNC REVIEWS FROM GOOGLE
 */
export async function syncReviewsFromGoogle(locationId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
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
      return { success: false, error: "Location not found" }
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

    const accessToken = await getValidAccessToken(supabase, account.id)

    const locationResource = buildLocationResourceName(
      account.account_id,
      location.location_id
    )

    // Fetch reviews from Google
    const endpoint = `${GMB_API_BASE}/${locationResource}/reviews`

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Reviews] Sync API error:", errorData)
      return {
        success: false,
        error: "Failed to fetch reviews from Google",
      }
    }

    const { reviews } = await response.json()

    if (!reviews || reviews.length === 0) {
      return {
        success: true,
        message: "No reviews found",
        data: { synced: 0 },
      }
    }

    let synced = 0

    // Upsert each review
    for (const googleReview of reviews) {
      const reviewData = {
        location_id: locationId,
        user_id: user.id,
        external_review_id: googleReview.reviewId || googleReview.name?.split("/").pop(),
        rating:
          googleReview.starRating === "FIVE"
            ? 5
            : googleReview.starRating === "FOUR"
            ? 4
            : googleReview.starRating === "THREE"
            ? 3
            : googleReview.starRating === "TWO"
            ? 2
            : 1,
        review_text: googleReview.comment || null,
        review_date: googleReview.createTime || new Date().toISOString(),
        reviewer_name: googleReview.reviewer?.displayName || "Anonymous",
        reviewer_display_name: googleReview.reviewer?.displayName || null,
        reviewer_profile_photo_url:
          googleReview.reviewer?.profilePhotoUrl || null,
        response: googleReview.reviewReply?.comment || null,
        reply_date: googleReview.reviewReply?.updateTime || null,
        responded_at: googleReview.reviewReply?.updateTime || null,
        has_reply: !!googleReview.reviewReply,
        status: googleReview.reviewReply ? "replied" : "pending",
        google_my_business_name: googleReview.name,
        review_url: googleReview.reviewUrl || null,
        synced_at: new Date().toISOString(),
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from("gmb_reviews")
        .select("id")
        .eq("external_review_id", reviewData.external_review_id)
        .single()

      const isNewReview = !existingReview

      const { error: upsertError, data: upsertedReview } = await supabase
        .from("gmb_reviews")
        .upsert(reviewData, {
          onConflict: "external_review_id",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (!upsertError) {
        synced++
        
        // Trigger auto-reply for new reviews (if enabled)
        if (isNewReview && upsertedReview && !upsertedReview.has_reply) {
          try {
            const { processAutoReply } = await import("./auto-reply")
            // Process auto-reply in background (don't wait for it)
            processAutoReply(upsertedReview.id).catch((error) => {
              console.error("[Reviews] Auto-reply error:", error)
              // Don't fail the sync if auto-reply fails
            })
          } catch (error) {
            console.error("[Reviews] Failed to trigger auto-reply:", error)
            // Don't fail the sync if auto-reply fails
          }
        }
      } else {
        console.error("[Reviews] Upsert error:", upsertError)
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/reviews")

    return {
      success: true,
      message: `Synced ${synced} reviews`,
      data: { synced },
    }
  } catch (error: any) {
    console.error("[Reviews] Sync error:", error)
    return {
      success: false,
      error: error.message || "Failed to sync reviews",
    }
  }
}

/**
 * 8. GET REVIEW STATISTICS
 */
export async function getReviewStats(locationId?: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated", data: null }
    }

    let query = supabase
      .from("gmb_reviews")
      .select("rating, has_reply, status, ai_sentiment")
      .eq("user_id", user.id)

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Reviews] Stats error:", error)
      return { success: false, error: error.message, data: null }
    }

    const stats = {
      total: data.length,
      pending: data.filter((r) => !r.has_reply).length,
      replied: data.filter((r) => r.has_reply).length,
      flagged: data.filter((r) => r.status === "flagged").length,
      byRating: {
        5: data.filter((r) => r.rating === 5).length,
        4: data.filter((r) => r.rating === 4).length,
        3: data.filter((r) => r.rating === 3).length,
        2: data.filter((r) => r.rating === 2).length,
        1: data.filter((r) => r.rating === 1).length,
      },
      bySentiment: {
        positive: data.filter((r) => r.ai_sentiment === "positive").length,
        neutral: data.filter((r) => r.ai_sentiment === "neutral").length,
        negative: data.filter((r) => r.ai_sentiment === "negative").length,
      },
      averageRating:
        data.reduce((sum, r) => sum + r.rating, 0) / (data.length || 1),
      responseRate: (data.filter((r) => r.has_reply).length / (data.length || 1)) * 100,
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error: any) {
    console.error("[Reviews] Stats error:", error)
    return {
      success: false,
      error: error.message || "Failed to get stats",
      data: null,
    }
  }
}

/**
 * 9. ARCHIVE REVIEW
 */
export async function archiveReview(reviewId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
      .from("gmb_reviews")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("user_id", user.id)

    if (error) {
      console.error("[Reviews] Archive error:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/reviews")

    return {
      success: true,
      message: "Review archived successfully",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to archive review",
    }
  }
}

