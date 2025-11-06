"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const GMB_API_BASE = "https://mybusiness.googleapis.com/v4"

// Validation schemas
const CreatePostSchema = z.object({
  locationId: z.string().uuid(),
  postType: z.enum(["whats_new", "event", "offer", "product"]),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1500),
  mediaUrl: z.string().url().optional(),
  ctaType: z.enum(["BOOK", "ORDER", "LEARN_MORE", "SIGN_UP", "CALL"]).optional(),
  ctaUrl: z.string().url().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/**
 * Get valid access token
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
    throw new Error("Failed to refresh token")
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

interface CreatePostData {
  locationId: string
  postType: "whats_new" | "event" | "offer" | "product"
  title?: string
  description: string
  mediaUrl?: string
  ctaType?: "BOOK" | "ORDER" | "LEARN_MORE" | "SIGN_UP" | "CALL"
  ctaUrl?: string
  startDate?: string
  endDate?: string
}

/**
 * Create a Google Business Profile post
 */
export async function createPost(data: CreatePostData) {
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
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please try again later.",
        }
      }

      console.error("[GMB Posts] API error:", errorData)
      return {
        success: false,
        error: errorData.error?.message || "Failed to create post on Google",
      }
    }

    const result = await response.json()

    // Save to database
    const { error: insertError } = await supabase.from("gmb_posts").insert({
      user_id: user.id,
      location_id: validatedData.locationId,
      provider_post_id: result.name?.split("/").pop() || null,
      post_type: validatedData.postType,
      title: validatedData.title || null,
      content: validatedData.description,
      media_url: validatedData.mediaUrl || null,
      call_to_action: validatedData.ctaType || null,
      call_to_action_url: validatedData.ctaUrl || null,
      scheduled_at: validatedData.startDate || null,
      published_at: new Date().toISOString(),
      status: "published",
      metadata: result,
    })

    if (insertError) {
      console.error("[GMB Posts] Database insert error:", insertError)
      // Don't fail the request since post was created on Google
    }

    revalidatePath("/dashboard")
    revalidatePath("/posts")

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error("[GMB Posts] Error creating post:", error)

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

/**
 * Get posts for a location
 */
export async function getPosts(locationId?: string) {
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
      .from("gmb_posts")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_name
        )
      `
      )
      .eq("user_id", user.id)
      .order("published_at", { ascending: false })
      .limit(50)

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[GMB Posts] Error fetching posts:", error)
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
    console.error("[GMB Posts] Error in getPosts:", error)
    return {
      success: false,
      error: error.message || "Failed to fetch posts",
      data: [],
    }
  }
}

/**
 * Delete a post
 */
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

    if (!account) {
      return {
        success: false,
        error: "GMB account not found. Please reconnect your Google account.",
      }
    }

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Delete from Google
    if (post.provider_post_id) {
      const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/localPosts/${post.provider_post_id}`

      const response = await fetch(gmbApiUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok && response.status !== 404) {
        console.error("[GMB Posts] Delete API error")
        return {
          success: false,
          error: "Failed to delete post from Google",
        }
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

    revalidatePath("/dashboard")
    revalidatePath("/posts")

    return {
      success: true,
    }
  } catch (error: any) {
    console.error("[GMB Posts] Delete error:", error)
    return {
      success: false,
      error: error.message || "Failed to delete post",
    }
  }
}

