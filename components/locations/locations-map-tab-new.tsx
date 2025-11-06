"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const isMobile = useIsMobile();
  
  // Fetch stats for selected location
  const { stats, loading: statsLoading, error: statsError } = useLocationMapData(selectedLocationId);

  // Handle locations error
  if (locationsError) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">Failed to load locations</p>
            <p className="text-sm text-muted-foreground">
              {locationsError.message || 'Please try refreshing the page'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create stable key based on locations content to avoid infinite loops
  // Use ref to track previous value and only update when content actually changes
  const prevLocationsRef = useRef<string>('');
  const locationsKeyRef = useRef<string>('');
  
  // Calculate current key
  const currentKey = locations.map(l => `${l.id}-${l.coordinates?.lat}-${l.coordinates?.lng}`).join('|');
  
  // Update ref only if content actually changed
  if (currentKey !== prevLocationsRef.current) {
    prevLocationsRef.current = currentKey;
    locationsKeyRef.current = currentKey;
  }
  
  const locationsKey = locationsKeyRef.current;

  // Set default selection to first location
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      const firstLocationWithCoords = locations.find(loc => loc.coordinates?.lat && loc.coordinates?.lng);
      if (firstLocationWithCoords) {
        setSelectedLocationId(firstLocationWithCoords.id);
      }
    }
  }, [locations, selectedLocationId]);

  // Get selected location - use stable dependency
  const selectedLocation = useMemo(() => {
    return locations.find(loc => loc.id === selectedLocationId);
  }, [selectedLocationId, locationsKey]);

  // Handle marker click
  const handleMarkerClick = (location: Location) => {
    setSelectedLocationId(location.id);
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading locations...</p>
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

  // Filter locations with coordinates
  const locationsWithCoords = useMemo(() => {
    return locations.filter(loc => 
      loc.coordinates?.lat && 
      loc.coordinates?.lng &&
      !isNaN(loc.coordinates.lat) &&
      !isNaN(loc.coordinates.lng)
    );
  }, [locationsKey]);

  const mapCenter = useMemo(() => {
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
  }, [
    selectedLocation?.coordinates?.lat, 
    selectedLocation?.coordinates?.lng,
    locationsKey
  ]);

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

