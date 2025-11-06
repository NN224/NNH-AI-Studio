"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocations } from '@/hooks/use-locations';
import { Location } from '@/components/locations/location-types';
import { MapView } from '@/components/locations/map-view';
import { useGoogleMaps } from '@/hooks/use-google-maps';
import { useLocationMapData } from '@/hooks/use-location-map-data';
import { useIsMobile } from '@/components/locations/responsive-locations-layout';
import { Loader2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  StatsOverviewCard,
  LocationDetailsCard,
  ActivityFeedCard,
  QuickActionsCard,
} from '@/components/locations/map-cards';

/**
 * Custom hook to track previous value
 */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * LocationsMapTab Component
 * Displays all user locations on a map with selection support
 * Features floating cards with real-time stats and activity feed
 * 
 * @features
 * - Google Maps integration with dark theme
 * - Multiple location markers with selection
 * - 4 floating cards: Stats, Details, Activity, Quick Actions
 * - Responsive design (mobile, tablet, desktop)
 * - Real-time data from APIs
 * - Glassmorphism UI effects
 */
export function LocationsMapTab() {
  const { locations, loading, error: locationsError } = useLocations({});
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const isMobile = useIsMobile();
  
  // Store locations in ref to avoid re-renders
  const locationsRef = useRef<Location[]>([]);
  const prevLocationCount = usePrevious(locations.length);
  
  // Update ref when locations change
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations.length]); // Only depend on length

  // Timeout for loading state (10 seconds)
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
        console.warn('⚠️ Locations loading timeout - taking longer than expected');
      }, 10000); // 10 seconds

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log('🔄 Loading locations...', { 
        timestamp: new Date().toISOString(),
        hasError: !!locationsError 
      });
    } else if (locationsError) {
      console.error('❌ Locations error:', {
        message: locationsError.message,
        name: locationsError.name,
        stack: locationsError.stack,
        timestamp: new Date().toISOString()
      });
    } else if (locations.length > 0) {
      console.log('✅ Locations loaded:', {
        count: locations.length,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('ℹ️ No locations found', {
        timestamp: new Date().toISOString()
      });
    }
  }, [loading, locationsError, locations.length]);

  // Fetch stats for selected location
  const { stats, loading: statsLoading, error: statsError } = useLocationMapData(selectedLocationId);

  // Effect 1: Set default selection to first location (only when count changes from 0)
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      const firstLocationWithCoords = locations.find(loc => loc.coordinates?.lat && loc.coordinates?.lng);
      if (firstLocationWithCoords) {
        setSelectedLocationId(firstLocationWithCoords.id);
      }
    }
  }, [locations.length, selectedLocationId]); // Only depend on length and selection

  // Get selected location directly - no useMemo needed
  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  // Filter locations with coordinates - calculate directly, no useMemo
  const locationsWithCoords = locations.filter(loc => 
    loc.coordinates?.lat && 
    loc.coordinates?.lng &&
    !isNaN(loc.coordinates.lat) &&
    !isNaN(loc.coordinates.lng)
  );

  // Calculate map center - simple calculation, no useMemo
  const mapCenter = (() => {
    if (selectedLocation?.coordinates) {
      return {
        lat: selectedLocation.coordinates.lat,
        lng: selectedLocation.coordinates.lng,
      };
    }

    if (locationsWithCoords.length === 0) {
      return { lat: 25.2048, lng: 55.2708 }; // Default: Dubai
    }

    if (locationsWithCoords.length === 1) {
      return {
        lat: locationsWithCoords[0].coordinates!.lat,
        lng: locationsWithCoords[0].coordinates!.lng,
      };
    }

    // Calculate center point
    const avgLat = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lat, 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lng, 0) / locationsWithCoords.length;

    return { lat: avgLat, lng: avgLng };
  })();

  // Handle marker click - stable callback with empty deps
  const handleMarkerClick = useCallback((location: Location) => {
    setSelectedLocationId(location.id);
  }, []); // Empty deps - stable function

  // Handle locations error
  if (locationsError) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2 text-destructive">Failed to load locations</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {locationsError.message || 'An error occurred while loading locations'}
            </p>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md text-left max-w-md mx-auto">
              <p className="font-mono mb-1">Error Details:</p>
              <p className="font-mono text-xs break-all">{locationsError.name}: {locationsError.message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state with timeout
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-2">Loading locations...</p>
            {loadingTimeout && (
              <div className="mt-4 text-center">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                  ⏱️ This is taking longer than expected
                </p>
                <p className="text-xs text-muted-foreground">
                  This might mean:
                  <br />• No locations exist in the database
                  <br />• There's a network issue
                  <br />• The API is slow to respond
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (loadError) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">Failed to load Google Maps</p>
            <p className="text-sm text-muted-foreground">
              {loadError.message || 'Please check your API key configuration'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Google Maps not loaded
  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading Google Maps...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No locations
  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No locations to display</h3>
            <p className="text-sm text-muted-foreground">
              Add locations to see them on the map
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[600px] md:min-h-[700px]">
      {/* Map View */}
      <MapView
        locations={locationsWithCoords}
        selectedLocationId={selectedLocationId}
        onMarkerClick={handleMarkerClick}
        center={mapCenter}
        className="absolute inset-0"
      />

      {/* Floating Cards */}
      {selectedLocation && (
        <>
          {/* Show cards only if stats are loaded (or show loading state) */}
          {statsLoading ? (
            // Loading state for cards
            <div className="absolute top-4 left-4 glass-strong rounded-[20px] p-6 z-10">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading location data...</span>
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Desktop Layout: All 4 cards in corners */}
              {!isMobile && (
                <>
                  <StatsOverviewCard
                    totalLocations={stats.totalLocations}
                    avgRating={stats.avgRating}
                    totalReviews={stats.reviewCount}
                    healthScore={stats.healthScore}
                  />
                  <LocationDetailsCard
                    location={selectedLocation}
                    healthScore={stats.healthScore}
                    rating={stats.avgRating}
                    ratingTrend={stats.ratingTrend}
                  />
                  <ActivityFeedCard locationId={selectedLocationId} />
                  <QuickActionsCard locationId={selectedLocationId} />
                </>
              )}

              {/* Mobile Layout: Stacked cards */}
              {isMobile && (
                <>
                  {/* Top cards */}
                  <StatsOverviewCard
                    totalLocations={stats.totalLocations}
                    avgRating={stats.avgRating}
                    totalReviews={stats.reviewCount}
                    healthScore={stats.healthScore}
                  />
                  <LocationDetailsCard
                    location={selectedLocation}
                    healthScore={stats.healthScore}
                    rating={stats.avgRating}
                    ratingTrend={stats.ratingTrend}
                  />
                  
                  {/* Bottom cards */}
                  <ActivityFeedCard locationId={selectedLocationId} />
                  <QuickActionsCard locationId={selectedLocationId} />
                </>
              )}
            </>
          ) : (
            // Error state - show at least location details even if stats fail
            <LocationDetailsCard
              location={selectedLocation}
              healthScore={selectedLocation.healthScore || 0}
              rating={selectedLocation.rating}
            />
          )}
        </>
      )}
    </div>
  );
}
