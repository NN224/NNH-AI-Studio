"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { syncReviewsFromGoogle as syncReviews } from "./reviews-management"
import { syncQuestionsFromGoogle as syncQuestions } from "./questions-management"

/**
 * Comprehensive sync for a location
 * Syncs location metadata, reviews, and questions from Google My Business
 */
export async function syncLocation(locationId: string) {
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

    // Verify user owns this location and get GMB account info
    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select("id, gmb_account_id, location_id")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single()

    if (locError || !location) {
      return {
        success: false,
        error: "Location not found or you don't have permission to sync it.",
      }
    }

    // Verify GMB account is active
    const { data: gmbAccount, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, is_active")
      .eq("id", location.gmb_account_id)
      .eq("user_id", user.id)
      .single()

    if (accountError || !gmbAccount || !gmbAccount.is_active) {
      return {
        success: false,
        error: "GMB account is not connected or inactive. Please reconnect your account.",
      }
    }

    const results = {
      reviews: { synced: 0, error: null },
      questions: { synced: 0, error: null },
    }

    // Sync reviews
    const reviewsResult = await syncReviews(locationId)
    if (reviewsResult.success) {
      results.reviews.synced = reviewsResult.data?.synced ?? 0
    } else {
      results.reviews.error = reviewsResult.error
    }

    // Sync questions
    const questionsResult = await syncQuestions(locationId)
    if (questionsResult.success) {
      results.questions.synced = questionsResult.data?.synced ?? 0
    } else {
      results.questions.error = questionsResult.error
    }

    // Update last_synced_at timestamp
    await supabase
      .from("gmb_locations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", locationId)

    revalidatePath("/dashboard")
    revalidatePath("/reviews")
    revalidatePath("/questions")
    revalidatePath("/locations")

    // Determine overall success
    const hasError = results.reviews.error || results.questions.error
    const hasSomeSuccess = results.reviews.synced > 0 || results.questions.synced > 0

    return {
      success: hasSomeSuccess || !hasError,
      results,
      message: hasError
        ? `Partial sync completed. Some items may have failed: ${results.reviews.error || results.questions.error}`
        : `Synced ${results.reviews.synced} reviews and ${results.questions.synced} questions`,
    }
  } catch (error: any) {
    console.error("[GMB Sync] Comprehensive sync error:", error)
    return {
      success: false,
      error: error.message || "Failed to sync location data",
    }
  }
}

/**
 * Sync all locations for a user
 */
export async function syncAllLocations() {
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

    // Verify user has an active GMB account
    const { data: activeAccounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("id, account_name")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (accountsError || !activeAccounts || activeAccounts.length === 0) {
      return {
        success: false,
        error: "No active GMB account found. Please connect your account first.",
      }
    }

    // Get all user's locations
    const { data: locations, error: locsError } = await supabase
      .from("gmb_locations")
      .select("id, location_name")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (locsError || !locations || locations.length === 0) {
      return {
        success: false,
        error: "No locations found to sync",
      }
    }

    const syncResults = []

    // Sync each location (with rate limiting consideration)
    for (const location of locations) {
      const result = await syncLocation(location.id)
      syncResults.push({
        locationId: location.id,
        locationName: location.location_name,
        ...result,
      })

      // Add a small delay between syncs to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const successCount = syncResults.filter((r) => r.success).length
    const totalCount = syncResults.length

    return {
      success: successCount > 0,
      syncResults,
      message: `Successfully synced ${successCount} of ${totalCount} locations`,
    }
  } catch (error: any) {
    console.error("[GMB Sync] Sync all locations error:", error)
    return {
      success: false,
      error: error.message || "Failed to sync all locations",
    }
  }
}

/**
 * Get sync status for a location
 */
export async function getSyncStatus(locationId: string) {
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
        data: null,
      }
    }

    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select("last_synced_at, is_active")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single()

    if (locError || !location) {
      return {
        success: false,
        error: "Location not found",
        data: null,
      }
    }

    const lastSyncedAt = location.last_synced_at
      ? new Date(location.last_synced_at)
      : null
    const now = new Date()
    const minutesSinceSync = lastSyncedAt
      ? Math.floor((now.getTime() - lastSyncedAt.getTime()) / (1000 * 60))
      : null

    return {
      success: true,
      data: {
        lastSyncedAt,
        minutesSinceSync,
        isStale: minutesSinceSync === null || minutesSinceSync > 60, // Consider stale after 1 hour
        isActive: location.is_active,
      },
    }
  } catch (error: any) {
    console.error("[GMB Sync] Get sync status error:", error)
    return {
      success: false,
      error: error.message || "Failed to get sync status",
      data: null,
    }
  }
}

