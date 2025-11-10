"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { LocationSchema, UpdateLocationSchema } from "@/lib/validations/dashboard"
import { z } from "zod"

/**
 * Helper function to validate GMB connection for location operations
 */
async function validateGMBConnection(supabase: any, userId: string, locationId?: string) {
  // Check if user has an active GMB account
  const { data: activeAccounts, error: accountsError } = await supabase
    .from("gmb_accounts")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (accountsError || !activeAccounts || activeAccounts.length === 0) {
    return {
      isValid: false,
      error: "No active GMB account found. Please connect your Google My Business account first.",
    }
  }

  // If locationId is provided, verify the location belongs to an active GMB account
  if (locationId) {
    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select("gmb_account_id")
      .eq("id", locationId)
      .eq("user_id", userId)
      .single()

    if (locError || !location) {
      return {
        isValid: false,
        error: "Location not found or access denied.",
      }
    }

    // Verify the location's GMB account is still active
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("is_active")
      .eq("id", location.gmb_account_id)
      .eq("user_id", userId)
      .single()

    if (accountError || !account || !account.is_active) {
      return {
        isValid: false,
        error: "The GMB account for this location is no longer active. Please reconnect your account.",
      }
    }
  }

  return { isValid: true, error: null }
}

export async function getLocations() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { locations: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch locations:", error)
    return { locations: [], error: error.message }
  }

  return { locations: data || [], error: null }
}

export async function addLocation(locationData: unknown) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { success: false, error: "Not authenticated" }
  }

  // Validate input data
  try {
    const validatedData = LocationSchema.parse(locationData)

    const { error } = await supabase
      .from("gmb_locations")
      .insert({
        ...validatedData,
        user_id: user.id,
        is_active: true,
        rating: 0,
      })

    if (error) {
      console.error("Failed to add location:", error)
      return { success: false, error: error.message }
    }

    revalidatePath('/locations')
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(", ")
      return { success: false, error: `Validation error: ${errorMessage}` }
    }
    console.error("Unexpected error:", error)
    return { success: false, error: "Failed to add location" }
  }
}

export async function updateLocation(locationId: string, updates: unknown) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { success: false, error: "Not authenticated" }
  }

  // Validate locationId
  if (!locationId || typeof locationId !== 'string') {
    return { success: false, error: "Invalid location ID" }
  }

  // Validate GMB connection for this location
  const connectionValidation = await validateGMBConnection(supabase, user.id, locationId)
  if (!connectionValidation.isValid) {
    return { success: false, error: connectionValidation.error }
  }

  // Validate update data
  try {
    const validatedUpdates = UpdateLocationSchema.parse(updates)

    const { error } = await supabase
      .from("gmb_locations")
      .update({
        ...validatedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to update location:", error)
      return { success: false, error: error.message }
    }

    revalidatePath('/locations')
    revalidatePath('/dashboard')
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(", ")
      return { success: false, error: `Validation error: ${errorMessage}` }
    }
    console.error("Unexpected error:", error)
    return { success: false, error: "Failed to update location" }
  }
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { success: false, error: "Not authenticated" }
  }

  // Validate locationId
  if (!locationId || typeof locationId !== 'string') {
    return { success: false, error: "Invalid location ID" }
  }

  // Validate GMB connection for this location
  const connectionValidation = await validateGMBConnection(supabase, user.id, locationId)
  if (!connectionValidation.isValid) {
    return { success: false, error: connectionValidation.error }
  }

  // Soft delete: mark as inactive instead of hard delete to preserve historical data
  const { error } = await supabase
    .from("gmb_locations")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId)
    .eq("user_id", user.id)

  if (error) {
    console.error("Failed to delete location:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/locations')
  revalidatePath('/dashboard')
  return { success: true, error: null }
}

/**
 * Get location sync status and validate GMB connection
 */
export async function getLocationSyncStatus(locationId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error("Authentication error:", authError)
    }
    return { 
      success: false, 
      error: "Not authenticated",
      data: null,
    }
  }

  if (!locationId || typeof locationId !== 'string') {
    return { 
      success: false, 
      error: "Invalid location ID",
      data: null,
    }
  }

  // Get location with GMB account info
  const { data: location, error: locError } = await supabase
    .from("gmb_locations")
    .select(`
      id,
      location_name,
      last_synced_at,
      is_active,
      gmb_account_id,
      gmb_accounts!inner (
        id,
        is_active,
        account_name,
        last_sync
      )
    `)
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

  const gmbAccount = Array.isArray(location.gmb_accounts) 
    ? location.gmb_accounts[0] 
    : location.gmb_accounts

  return {
    success: true,
    data: {
      locationId: location.id,
      locationName: location.location_name,
      lastSyncedAt,
      minutesSinceSync,
      isStale: minutesSinceSync === null || minutesSinceSync > 60, // Consider stale after 1 hour
      isActive: location.is_active,
      gmbAccountActive: gmbAccount?.is_active ?? false,
      gmbAccountName: gmbAccount?.account_name ?? null,
      canSync: location.is_active && (gmbAccount?.is_active ?? false),
    },
    error: null,
  }
}

/**
 * Validate that a location can perform GMB operations
 */
export async function validateLocationForGMBOperations(locationId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { 
      isValid: false, 
      error: "Not authenticated",
    }
  }

  if (!locationId || typeof locationId !== 'string') {
    return { 
      isValid: false, 
      error: "Invalid location ID",
    }
  }

  const connectionValidation = await validateGMBConnection(supabase, user.id, locationId)
  return connectionValidation
}
