"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { LocationSchema, UpdateLocationSchema } from "@/lib/validations/dashboard"
import { z } from "zod"

export async function getLocations() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error("Authentication error:", authError)
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
    console.error("Authentication error:", authError)
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
    console.error("Authentication error:", authError)
    return { success: false, error: "Not authenticated" }
  }

  // Validate locationId
  if (!locationId || typeof locationId !== 'string') {
    return { success: false, error: "Invalid location ID" }
  }

  // Validate update data
  try {
    const validatedUpdates = UpdateLocationSchema.parse(updates)

    const { error } = await supabase
      .from("gmb_locations")
      .update(validatedUpdates)
      .eq("id", locationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to update location:", error)
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
    return { success: false, error: "Failed to update location" }
  }
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error("Authentication error:", authError)
    return { success: false, error: "Not authenticated" }
  }

  // Validate locationId
  if (!locationId || typeof locationId !== 'string') {
    return { success: false, error: "Invalid location ID" }
  }

  const { error } = await supabase
    .from("gmb_locations")
    .delete()
    .eq("id", locationId)
    .eq("user_id", user.id)

  if (error) {
    console.error("Failed to delete location:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/locations')
  return { success: true, error: null }
}
