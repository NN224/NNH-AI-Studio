"use client";

import { useAICommandCenterData } from "@/hooks/use-ai-command-center";
import { useSelectedLocation } from "@/hooks/use-selected-location";

/**
 * Combined hook for Home page data
 * - Fetches selected location preference
 * - Fetches command center data for that location
 * - Provides unified loading/error states
 */
export function useHomeData() {
  // Get selected location
  const {
    selectedLocationId,
    selectedLocation,
    locations,
    locationsCount,
    isLoading: isLoadingLocation,
    selectLocation,
  } = useSelectedLocation();

  // Fetch command center data for selected location
  const {
    data: commandCenterData,
    isLoading: isLoadingData,
    isFetching,
    error,
    refetch,
  } = useAICommandCenterData(selectedLocationId);

  return {
    // Location data
    selectedLocationId,
    selectedLocation,
    locations,
    locationsCount,
    selectLocation,

    // Command center data
    businessInfo: commandCenterData?.businessInfo || null,
    urgentItems: commandCenterData?.urgentItems || [],
    managementStats: commandCenterData?.managementStats || null,

    // Loading states
    isLoading: isLoadingLocation || isLoadingData,
    isFetching,

    // Error
    error,

    // Actions
    refetch,
  };
}

/**
 * Hook to check if user has any GMB locations
 */
export function useHasLocations() {
  const { locationsCount, isLoading } = useSelectedLocation();

  return {
    hasLocations: locationsCount > 0,
    locationsCount,
    isLoading,
  };
}
