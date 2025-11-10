'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GMBLocation } from '@/lib/types/gmb-types';

interface UseGMBReturn {
  locations: GMBLocation[];
  isLoading: boolean;
  error: Error | null;
  selectedLocation: GMBLocation | null;
  handleLocationSelect: (locationId: string) => void;
  refresh: () => void;
}

/**
 * Hook for managing GMB locations and selection state
 */
export function useGMB(): UseGMBReturn {
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<GMBLocation | null>(null);

  // Fetch locations from API
  const { data: locations = [], isLoading, error } = useQuery<GMBLocation[]>({
    queryKey: ['gmb-locations'],
    queryFn: async () => {
      const response = await fetch('/api/gmb/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      return data.locations || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Set initial selected location when locations are loaded
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      // Select first active location or first location
      const activeLocation = locations.find(loc => loc.is_active);
      setSelectedLocation(activeLocation || locations[0]);
    }
  }, [locations, selectedLocation]);

  // Handle location selection
  const handleLocationSelect = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
    }
  };

  // Refresh locations
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['gmb-locations'] });
  };

  return {
    locations,
    isLoading,
    error: error as Error | null,
    selectedLocation,
    handleLocationSelect,
    refresh,
  };
}
