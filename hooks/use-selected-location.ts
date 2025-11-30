"use client";

import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

// Types
export interface GMBLocation {
  id: string;
  location_name: string;
  address?: string;
  phone?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  logo_url?: string;
  is_active: boolean;
  is_imported?: boolean;
  gmb_account_id: string;
}

export interface SelectedLocationState {
  locationId: string | null;
  location: GMBLocation | null;
  allLocations: GMBLocation[];
  isLoading: boolean;
  error: Error | null;
}

// Local storage key for fallback
const SELECTED_LOCATION_KEY = "nnh_selected_location_id";

/**
 * Hook to manage selected location state
 * - Fetches all user's GMB locations
 * - Manages selected location (saved in database + localStorage fallback)
 * - Provides functions to change selection
 */
export function useSelectedLocation() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    async function getUser() {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, [supabase]);

  // Fetch all locations for the user
  const locationsQuery = useQuery({
    queryKey: ["user-locations", userId],
    queryFn: async (): Promise<GMBLocation[]> => {
      if (!userId || !supabase) return [];

      const { data, error } = await supabase
        .from("gmb_locations")
        .select(
          `
          id,
          location_name,
          address,
          phone,
          category,
          rating,
          review_count,
          logo_url,
          is_active,
          gmb_account_id
        `,
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching locations:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user's selected location preference
  const preferenceQuery = useQuery({
    queryKey: ["selected-location-preference", userId],
    queryFn: async (): Promise<string | null> => {
      if (!userId || !supabase) return null;

      // Try to get from database first
      const { data, error } = await supabase
        .from("user_preferences")
        .select("selected_location_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching preference:", error);
      }

      // If found in database, return it
      if (data?.selected_location_id) {
        // Sync to localStorage for faster access
        localStorage.setItem(SELECTED_LOCATION_KEY, data.selected_location_id);
        return data.selected_location_id;
      }

      // Fallback to localStorage
      const localValue = localStorage.getItem(SELECTED_LOCATION_KEY);
      if (localValue) {
        return localValue;
      }

      // Default to first location if available
      if (locationsQuery.data && locationsQuery.data.length > 0) {
        return locationsQuery.data[0].id;
      }

      return null;
    },
    enabled: !!userId && locationsQuery.isSuccess,
  });

  // Mutation to update selected location
  const updateMutation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error("User not authenticated");

      // Update localStorage immediately for fast UI response
      localStorage.setItem(SELECTED_LOCATION_KEY, locationId);

      // Try to upsert in database (may fail if table doesn't exist yet)
      try {
        if (!supabase) throw new Error("Supabase not initialized");
        const { error } = await supabase.from("user_preferences").upsert(
          {
            user_id: userId,
            selected_location_id: locationId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

        if (error) {
          console.warn("Could not save preference to database:", error);
          // Don't throw - localStorage is our fallback
        }
      } catch (err) {
        console.warn(
          "Database preference save failed, using localStorage:",
          err,
        );
      }

      return locationId;
    },
    onSuccess: (locationId) => {
      // Update the cache
      queryClient.setQueryData(
        ["selected-location-preference", userId],
        locationId,
      );

      // Invalidate location-dependent queries
      queryClient.invalidateQueries({ queryKey: ["location-data"] });
      queryClient.invalidateQueries({ queryKey: ["ai-command-center-data"] });
    },
  });

  // Get the current selected location object
  const selectedLocation = useCallback((): GMBLocation | null => {
    const selectedId = preferenceQuery.data;
    if (!selectedId || !locationsQuery.data) return null;

    return (
      locationsQuery.data.find((loc) => loc.id === selectedId) ||
      locationsQuery.data[0] ||
      null
    );
  }, [preferenceQuery.data, locationsQuery.data]);

  // Function to select a location
  const selectLocation = useCallback(
    (locationId: string) => {
      updateMutation.mutate(locationId);
    },
    [updateMutation],
  );

  return {
    // Current selection
    selectedLocationId: preferenceQuery.data || null,
    selectedLocation: selectedLocation(),

    // All locations
    locations: locationsQuery.data || [],
    locationsCount: locationsQuery.data?.length || 0,

    // Loading states
    isLoading:
      locationsQuery.isLoading ||
      preferenceQuery.isLoading ||
      updateMutation.isPending,
    isLocationsLoading: locationsQuery.isLoading,
    isUpdating: updateMutation.isPending,

    // Errors
    error: locationsQuery.error || preferenceQuery.error || null,

    // Actions
    selectLocation,
    refetchLocations: locationsQuery.refetch,
  };
}

/**
 * Hook to get just the selected location ID (lightweight)
 */
export function useSelectedLocationId(): string | null {
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    // Get from localStorage first (fast)
    const stored = localStorage.getItem(SELECTED_LOCATION_KEY);
    if (stored) {
      setLocationId(stored);
    }
  }, []);

  return locationId;
}
