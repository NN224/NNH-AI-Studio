"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { GMBPost } from "@/lib/types/database"

const GMB_API_BASE = "https://mybusiness.googleapis.com/v4"

// Validation schemas
const CreatePostSchema = z.object({
  locationId: z.string().uuid(),
  postType: z.enum(["whats_new", "event", "offer", "product"]),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1500),
  mediaUrl: z.string().url().optional(),
  ctaType: z.enum(["BOOK", "ORDER", "LEARN_MORE", "SIGN_UP", "CALL", "SHOP"]).optional(),
  ctaUrl: z.string().url().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
})

const UpdatePostSchema = z.object({
  postId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1500).optional(),
  mediaUrl: z.string().url().optional(),
  ctaType: z.enum(["BOOK", "ORDER", "LEARN_MORE", "SIGN_UP", "CALL", "SHOP"]).optional(),
  ctaUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
})

const FilterSchema = z.object({
  locationId: z.string().uuid().optional(),
  postType: z.enum(['whats_new', 'event', 'offer', 'product', 'all']).optional(),
  status: z.enum(['draft', 'queued', 'published', 'failed', 'all']).optional(),
  searchQuery: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'scheduled']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
})

/**
 * Get valid access token with refresh logic
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
    throw new Error("GMB account not found")
  }

  const now = Date.now()
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0

  if (expiresAt > now + 5 * 60 * 1000) {
    return account.access_token
  }

  // Refresh token
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
    throw new Error("Failed to refresh token. Please reconnect your Google account.")
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

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
 * Map post type to Google's topic type
 */
function mapPostType(postType: string): string {
  const mapping: Record<string, string> = {
    whats_new: "STANDARD",
    event: "EVENT",
    offer: "OFFER",
    product: "PRODUCT",
  }
  return mapping[postType] || "STANDARD"
}

// ============================================
// 1. GET POSTS WITH ADVANCED FILTERING
// ============================================
export async function getPosts(params: z.infer<typeof FilterSchema>) {
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
      .from("gmb_posts")
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
    if (validatedParams.locationId && validatedParams.locationId !== "all") {
      query = query.eq("location_id", validatedParams.locationId)
    }

    if (validatedParams.postType && validatedParams.postType !== "all") {
      query = query.eq("post_type", validatedParams.postType)
    }

    if (validatedParams.status && validatedParams.status !== "all") {
      query = query.eq("status", validatedParams.status)
    }

    if (validatedParams.searchQuery) {
      query = query.or(
        `content.ilike.%${validatedParams.searchQuery}%,title.ilike.%${validatedParams.searchQuery}%`
      )
    }

    // Apply sorting
    switch (validatedParams.sortBy) {
      case "newest":
        query = query.order("published_at", { ascending: false, nullsFirst: false })
        query = query.order("created_at", { ascending: false })
        break
      case "oldest":
        query = query.order("published_at", { ascending: true, nullsFirst: false })
        query = query.order("created_at", { ascending: true })
        break
      case "scheduled":
        query = query.order("scheduled_at", { ascending: true, nullsFirst: false })
        break
      default:
        query = query.order("created_at", { ascending: false })
    }

    // Pagination
    const limit = validatedParams.limit || 50
    const offset = validatedParams.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("[Posts] Get posts error:", error)
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0,
      }
    }

    // Transform data to include location_name
    const posts = (data || []).map((post: any) => ({
      ...post,
      location_name: post.gmb_locations?.location_name,
      location_address: post.gmb_locations?.address,
    }))

    return {
      success: true,
      data: posts,
      count: count || 0,
    }
  } catch (error: any) {
    console.error("[Posts] Get posts error:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
        data: [],
        count: 0,
      }
    }
    return {
      success: false,
      error: error.message || "Failed to fetch posts",
      data: [],
      count: 0,
    }
  }
}

// ============================================
// 2. CREATE POST
// ============================================
export async function createPost(data: z.infer<typeof CreatePostSchema>) {
  try {
    const validatedData = CreatePostSchema.parse(data)
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
      .eq("id", validatedData.locationId)
      .eq("user_id", user.id)
      .single()

    if (locError || !location) {
      return {
        success: false,
        error: "Location not found or you don't have permission to post to it.",
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

    // If scheduled, save as draft/queued without publishing to Google
    if (validatedData.scheduledAt) {
      const { error: insertError } = await supabase.from("gmb_posts").insert({
        user_id: user.id,
        location_id: validatedData.locationId,
        post_type: validatedData.postType,
        title: validatedData.title || null,
        content: validatedData.description,
        media_url: validatedData.mediaUrl || null,
        call_to_action: validatedData.ctaType || null,
        call_to_action_url: validatedData.ctaUrl || null,
        scheduled_at: validatedData.scheduledAt,
        status: "queued",
        metadata: {},
      })

      if (insertError) {
        console.error("[Posts] Database insert error:", insertError)
        return {
          success: false,
          error: "Failed to save scheduled post",
        }
      }

      revalidatePath("/posts")
      revalidatePath("/dashboard")

      return {
        success: true,
        message: "Post scheduled successfully",
      }
    }

    // Publish immediately
    const accessToken = await getValidAccessToken(supabase, account.id)

    // Prepare post data for Google API
    const postData: any = {
      languageCode: "en",
      summary: validatedData.description,
      topicType: mapPostType(validatedData.postType),
    }

    // Add event details if it's an event post
    if (validatedData.postType === "event" && validatedData.title) {
      postData.event = {
        title: validatedData.title,
        schedule: {},
      }

      if (validatedData.startDate) {
        postData.event.schedule.startDate = {
          year: new Date(validatedData.startDate).getFullYear(),
          month: new Date(validatedData.startDate).getMonth() + 1,
          day: new Date(validatedData.startDate).getDate(),
        }
        postData.event.schedule.startTime = {
          hours: new Date(validatedData.startDate).getHours(),
          minutes: new Date(validatedData.startDate).getMinutes(),
        }
      }

      if (validatedData.endDate) {
        postData.event.schedule.endDate = {
          year: new Date(validatedData.endDate).getFullYear(),
          month: new Date(validatedData.endDate).getMonth() + 1,
          day: new Date(validatedData.endDate).getDate(),
        }
        postData.event.schedule.endTime = {
          hours: new Date(validatedData.endDate).getHours(),
          minutes: new Date(validatedData.endDate).getMinutes(),
        }
      }
    }

    // Add offer details
    if (validatedData.postType === "offer" && validatedData.title) {
      postData.offer = {
        couponCode: "",
        redeemOnlineUrl: validatedData.ctaUrl || "",
        termsConditions: validatedData.description,
      }
    }

    // Add media if provided
    if (validatedData.mediaUrl) {
      postData.media = [
        {
          mediaFormat: "PHOTO",
          sourceUrl: validatedData.mediaUrl,
        },
      ]
    }

    // Add call to action
    if (validatedData.ctaType && validatedData.ctaUrl) {
      postData.callToAction = {
        actionType: validatedData.ctaType,
        url: validatedData.ctaUrl,
      }
    }

    // Call Google My Business API (only for whats_new posts)
    let googleResult = null
    if (validatedData.postType === "whats_new") {
      const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/localPosts`

      const response = await fetch(gmbApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          return {
            success: false,
            error: "Authentication expired. Please reconnect your Google account.",
            errorCode: "AUTH_EXPIRED",
          }
        }

        if (response.status === 403) {
          return {
            success: false,
            error: "Permission denied. Please check your Google Business Profile permissions.",
            errorCode: "PERMISSION_DENIED",
          }
        }

        if (response.status === 429) {
          return {
            success: false,
            error: "Too many requests. Please try again later.",
            errorCode: "RATE_LIMIT",
          }
        }

        console.error("[Posts] API error:", errorData)
        return {
          success: false,
          error: errorData.error?.message || "Failed to create post on Google",
        }
      }

      googleResult = await response.json()
    }

    // Save to database
    const { error: insertError } = await supabase.from("gmb_posts").insert({
      user_id: user.id,
      location_id: validatedData.locationId,
      provider_post_id: googleResult?.name?.split("/").pop() || null,
      post_type: validatedData.postType,
      title: validatedData.title || null,
      content: validatedData.description,
      media_url: validatedData.mediaUrl || null,
      call_to_action: validatedData.ctaType || null,
      call_to_action_url: validatedData.ctaUrl || null,
      scheduled_at: validatedData.scheduledAt || null,
      published_at: googleResult ? new Date().toISOString() : null,
      status: googleResult ? "published" : "draft",
      metadata: googleResult || {},
    })

    if (insertError) {
      console.error("[Posts] Database insert error:", insertError)
      // Don't fail if post was created on Google
      if (googleResult) {
        return {
          success: true,
          message: "Post published on Google but failed to save to database",
        }
      }
      return {
        success: false,
        error: "Failed to save post",
      }
    }

    revalidatePath("/posts")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: validatedData.postType === "whats_new" ? "Post published successfully" : "Post saved as draft",
    }
  } catch (error: any) {
    console.error("[Posts] Create post error:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      }
    }

    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}

// ============================================
// 3. UPDATE POST
// ============================================
export async function updatePost(data: z.infer<typeof UpdatePostSchema>) {
  try {
    const validatedData = UpdatePostSchema.parse(data)
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

    // Get post details
    const { data: post, error: fetchError } = await supabase
      .from("gmb_posts")
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
      .eq("id", validatedData.postId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !post) {
      return {
        success: false,
        error: "Post not found",
      }
    }

    // Update database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.content = validatedData.description
    if (validatedData.mediaUrl !== undefined) updateData.media_url = validatedData.mediaUrl
    if (validatedData.ctaType !== undefined) updateData.call_to_action = validatedData.ctaType
    if (validatedData.ctaUrl !== undefined) updateData.call_to_action_url = validatedData.ctaUrl
    if (validatedData.scheduledAt !== undefined) {
      updateData.scheduled_at = validatedData.scheduledAt
      updateData.status = validatedData.scheduledAt ? "queued" : "draft"
    }

    const { error: updateError } = await supabase
      .from("gmb_posts")
      .update(updateData)
      .eq("id", validatedData.postId)

    if (updateError) {
      console.error("[Posts] Update error:", updateError)
      return {
        success: false,
        error: "Failed to update post",
      }
    }

    // If post is published and we're updating content, update on Google too
    if (post.status === "published" && post.provider_post_id && validatedData.description) {
      const location = post.gmb_locations
      const account = Array.isArray(location.gmb_accounts)
        ? location.gmb_accounts[0]
        : location.gmb_accounts

      if (account) {
        try {
          const accessToken = await getValidAccessToken(supabase, account.id)
          const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/localPosts/${post.provider_post_id}`

          const postData: any = {
            languageCode: "en",
            summary: validatedData.description,
            topicType: mapPostType(post.post_type),
          }

          if (validatedData.mediaUrl) {
            postData.media = [
              {
                mediaFormat: "PHOTO",
                sourceUrl: validatedData.mediaUrl,
              },
            ]
          }

          if (validatedData.ctaType && validatedData.ctaUrl) {
            postData.callToAction = {
              actionType: validatedData.ctaType,
              url: validatedData.ctaUrl,
            }
          }

          const response = await fetch(gmbApiUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(postData),
          })

          if (!response.ok) {
            console.error("[Posts] Failed to update post on Google")
            // Don't fail the request, post is updated in database
          }
        } catch (error) {
          console.error("[Posts] Error updating post on Google:", error)
          // Continue, post is updated in database
        }
      }
    }

    revalidatePath("/posts")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Post updated successfully",
    }
  } catch (error: any) {
    console.error("[Posts] Update post error:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      }
    }

    return {
      success: false,
      error: error.message || "Failed to update post",
    }
  }
}

// ============================================
// 4. DELETE POST
// ============================================
export async function deletePost(postId: string) {
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

    // Get post details
    const { data: post, error: fetchError } = await supabase
      .from("gmb_posts")
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
      .eq("id", postId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !post) {
      return {
        success: false,
        error: "Post not found",
      }
    }

    const location = post.gmb_locations
    const account = Array.isArray(location.gmb_accounts)
      ? location.gmb_accounts[0]
      : location.gmb_accounts

    // Delete from Google if published
    if (post.status === "published" && post.provider_post_id && account) {
      try {
        const accessToken = await getValidAccessToken(supabase, account.id)
        const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/localPosts/${post.provider_post_id}`

        const response = await fetch(gmbApiUrl, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok && response.status !== 404) {
          if (response.status === 401) {
            return {
              success: false,
              error: "Authentication expired. Please reconnect your Google account.",
              errorCode: "AUTH_EXPIRED",
            }
          }
          console.error("[Posts] Delete API error")
          // Continue to delete from database
        }
      } catch (error) {
        console.error("[Posts] Error deleting from Google:", error)
        // Continue to delete from database
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("gmb_posts")
      .delete()
      .eq("id", postId)

    if (deleteError) {
      return {
        success: false,
        error: "Failed to delete post from database",
      }
    }

    revalidatePath("/posts")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Post deleted successfully",
    }
  } catch (error: any) {
    console.error("[Posts] Delete error:", error)
    return {
      success: false,
      error: error.message || "Failed to delete post",
    }
  }
}

// ============================================
// 5. PUBLISH POST (for drafts/queued posts)
// ============================================
export async function publishPost(postId: string) {
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

    // Get post details
    const { data: post, error: fetchError } = await supabase
      .from("gmb_posts")
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
      .eq("id", postId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !post) {
      return {
        success: false,
        error: "Post not found",
      }
    }

    // Only whats_new posts can be published
    if (post.post_type !== "whats_new") {
      return {
        success: false,
        error: "Only 'What's New' posts can be published to Google",
      }
    }

    if (post.status === "published") {
      return {
        success: false,
        error: "Post is already published",
      }
    }

    const location = post.gmb_locations
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

    // Prepare post data for Google API
    const postData: any = {
      languageCode: "en",
      summary: post.content,
      topicType: mapPostType(post.post_type),
    }

    if (post.media_url) {
      postData.media = [
        {
          mediaFormat: "PHOTO",
          sourceUrl: post.media_url,
        },
      ]
    }

    if (post.call_to_action && post.call_to_action_url) {
      postData.callToAction = {
        actionType: post.call_to_action,
        url: post.call_to_action_url,
      }
    }

    // Call Google My Business API
    const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/localPosts`

    const response = await fetch(gmbApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication expired. Please reconnect your Google account.",
          errorCode: "AUTH_EXPIRED",
        }
      }

      if (response.status === 403) {
        return {
          success: false,
          error: "Permission denied. Please check your Google Business Profile permissions.",
          errorCode: "PERMISSION_DENIED",
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please try again later.",
          errorCode: "RATE_LIMIT",
        }
      }

      console.error("[Posts] Publish API error:", errorData)
      return {
        success: false,
        error: errorData.error?.message || "Failed to publish post on Google",
      }
    }

    const result = await response.json()

    // Update post in database
    const { error: updateError } = await supabase
      .from("gmb_posts")
      .update({
        provider_post_id: result.name?.split("/").pop() || null,
        published_at: new Date().toISOString(),
        status: "published",
        metadata: result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)

    if (updateError) {
      console.error("[Posts] Database update error:", updateError)
      // Post was published on Google, so return success
    }

    revalidatePath("/posts")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Post published successfully",
    }
  } catch (error: any) {
    console.error("[Posts] Publish post error:", error)
    return {
      success: false,
      error: error.message || "Failed to publish post",
    }
  }
}

// ============================================
// 6. SYNC POSTS FROM GOOGLE
// ============================================
export async function syncPostsFromGoogle(locationId?: string) {
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
        synced: 0,
      }
    }

    // Get locations to sync
    let locationsQuery = supabase
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
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (locationId && locationId !== "all") {
      locationsQuery = locationsQuery.eq("id", locationId)
    }

    const { data: locations, error: locationsError } = await locationsQuery

    if (locationsError || !locations || locations.length === 0) {
      return {
        success: false,
        error: "No locations found",
        synced: 0,
      }
    }

    let totalSynced = 0

    for (const location of locations) {
      const account = Array.isArray(location.gmb_accounts)
        ? location.gmb_accounts[0]
        : location.gmb_accounts

      if (!account) continue

      try {
        const accessToken = await getValidAccessToken(supabase, account.id)
        const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/localPosts`

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
              errorCode: "AUTH_EXPIRED",
              synced: totalSynced,
            }
          }
          console.error(`[Posts] Failed to sync posts for location ${location.id}`)
          continue
        }

        const data = await response.json()
        const posts = data.localPosts || []

        // Upsert posts
        for (const googlePost of posts) {
          const providerPostId = googlePost.name?.split("/").pop()

          if (!providerPostId) continue

          const { error: upsertError } = await supabase
            .from("gmb_posts")
            .upsert(
              {
                user_id: user.id,
                location_id: location.id,
                provider_post_id: providerPostId,
                title: googlePost.summary?.substring(0, 200) || null,
                content: googlePost.summary || "",
                post_type: googlePost.topicType === "STANDARD" ? "whats_new" : "whats_new",
                status: "published",
                published_at: googlePost.createTime || new Date().toISOString(),
                metadata: googlePost,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "provider_post_id",
                ignoreDuplicates: false,
              }
            )

          if (!upsertError) {
            totalSynced++
          }
        }
      } catch (error) {
        console.error(`[Posts] Error syncing location ${location.id}:`, error)
        continue
      }
    }

    revalidatePath("/posts")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Synced ${totalSynced} posts`,
      synced: totalSynced,
    }
  } catch (error: any) {
    console.error("[Posts] Sync posts error:", error)
    return {
      success: false,
      error: error.message || "Failed to sync posts",
      synced: 0,
    }
  }
}

// ============================================
// 7. GET POST STATISTICS
// ============================================
export async function getPostStats(locationId?: string) {
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
        stats: null,
      }
    }

    let query = supabase
      .from("gmb_posts")
      .select("status, post_type, published_at, scheduled_at", { count: "exact" })
      .eq("user_id", user.id)

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error("[Posts] Get stats error:", error)
      return {
        success: false,
        error: error.message,
        stats: null,
      }
    }

    const stats = {
      total: posts?.length || 0,
      published: posts?.filter((p) => p.status === "published").length || 0,
      drafts: posts?.filter((p) => p.status === "draft").length || 0,
      scheduled: posts?.filter((p) => p.status === "queued").length || 0,
      failed: posts?.filter((p) => p.status === "failed").length || 0,
      whatsNew: posts?.filter((p) => p.post_type === "whats_new").length || 0,
      events: posts?.filter((p) => p.post_type === "event").length || 0,
      offers: posts?.filter((p) => p.post_type === "offer").length || 0,
      thisWeek: posts?.filter((p) => {
        if (!p.published_at) return false
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(p.published_at) >= weekAgo
      }).length || 0,
    }

    return {
      success: true,
      stats,
    }
  } catch (error: any) {
    console.error("[Posts] Get stats error:", error)
    return {
      success: false,
      error: error.message || "Failed to get post statistics",
      stats: null,
    }
  }
}

// ============================================
// 8. BULK DELETE POSTS
// ============================================
export async function bulkDeletePosts(postIds: string[]) {
  try {
    if (!postIds || postIds.length === 0) {
      return {
        success: false,
        error: "No posts selected",
        deleted: 0,
      }
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        deleted: 0,
      }
    }

    let deleted = 0
    const errors: string[] = []

    for (const postId of postIds) {
      const result = await deletePost(postId)
      if (result.success) {
        deleted++
      } else {
        errors.push(result.error || "Unknown error")
      }
    }

    return {
      success: deleted > 0,
      message: `Deleted ${deleted} of ${postIds.length} posts`,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: any) {
    console.error("[Posts] Bulk delete error:", error)
    return {
      success: false,
      error: error.message || "Failed to delete posts",
      deleted: 0,
    }
  }
}

// ============================================
// 9. BULK PUBLISH POSTS
// ============================================
export async function bulkPublishPosts(postIds: string[]) {
  try {
    if (!postIds || postIds.length === 0) {
      return {
        success: false,
        error: "No posts selected",
        published: 0,
      }
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        published: 0,
      }
    }

    let published = 0
    const errors: string[] = []

    for (const postId of postIds) {
      const result = await publishPost(postId)
      if (result.success) {
        published++
      } else {
        errors.push(result.error || "Unknown error")
      }
    }

    return {
      success: published > 0,
      message: `Published ${published} of ${postIds.length} posts`,
      published,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: any) {
    console.error("[Posts] Bulk publish error:", error)
    return {
      success: false,
      error: error.message || "Failed to publish posts",
      published: 0,
    }
  }
}

