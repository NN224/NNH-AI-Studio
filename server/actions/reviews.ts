"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ReviewReplySchema, ReviewStatusSchema } from "@/lib/validations/dashboard"
import { z } from "zod"

export async function getReviews(locationId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { reviews: [], error: "Not authenticated" }
  }

  let query = supabase
    .from("gmb_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (locationId && locationId !== "all") {
    query = query.eq("location_id", locationId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch reviews:", error)
    return { reviews: [], error: error.message }
  }

  return { reviews: data || [], error: null }
}

export async function updateReviewStatus(reviewId: string, status: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { success: false, error: "Not authenticated" }
  }

  // Validate input
  try {
    const validatedData = ReviewStatusSchema.parse({ reviewId, status })

    const { error } = await supabase
      .from("gmb_reviews")
      .update({ status: validatedData.status })
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to update review status:", error)
      return { success: false, error: error.message }
    }

    revalidatePath('/reviews')
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(", ")
      return { success: false, error: `Validation error: ${errorMessage}` }
    }
    console.error("Unexpected error:", error)
    return { success: false, error: "Failed to update review status" }
  }
}

export async function addReviewReply(reviewId: string, reply: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { success: false, error: "Not authenticated" }
  }

  // Validate input
  try {
    const validatedData = ReviewReplySchema.parse({ reviewId, reply })

    const { error } = await supabase
      .from("gmb_reviews")
      .update({ 
        response: validatedData.reply,
        status: "responded",
        responded_at: new Date().toISOString()
      })
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to add review reply:", error)
      return { success: false, error: error.message }
    }

    revalidatePath('/reviews')
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(", ")
      return { success: false, error: `Validation error: ${errorMessage}` }
    }
    console.error("Unexpected error:", error)
    return { success: false, error: "Failed to add review reply" }
  }
}
