"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, MarkerClustererF } from '@react-google-maps/api';
import { Location } from '@/components/locations/location-types';
import { getMarkerIcon, MAP_CONTAINER_STYLE, DEFAULT_MAP_OPTIONS } from '@/utils/map-styles';
import { useGoogleMaps } from '@/hooks/use-google-maps';

interface MapViewProps {
  locations: Location[];
  selectedLocationId?: string;
  onMarkerClick?: (location: Location) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

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

export function MapView({
  locations,
  selectedLocationId,
  onMarkerClick,
  center,
  zoom = 10,
  className = '',
}: MapViewProps) {
  const { isLoaded: mapsLoaded, loadError } = useGoogleMaps();
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  // Track location count to detect changes
  const locationCount = locations.length;
  const prevLocationCount = usePrevious(locationCount);

  // Filter locations with coordinates - calculate directly, no useMemo
  const locationsWithCoords = locations.filter(loc => 
    loc.coordinates?.lat &&
    loc.coordinates?.lng &&
    !isNaN(loc.coordinates.lat) &&
    !isNaN(loc.coordinates.lng)
  );

  // Calculate center - simple calculation, no useMemo
  const calculatedCenter = (() => {
    if (center) return center;
    if (locationsWithCoords.length === 0) {
      return null; // No mock coordinates - return null if no valid coordinates
    }
    if (locationsWithCoords.length === 1) {
      return {
        lat: locationsWithCoords[0].coordinates!.lat,
        lng: locationsWithCoords[0].coordinates!.lng,
      };
    }
    const avgLat = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lat, 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lng, 0) / locationsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  })();

  // Effect 1: Fit bounds when location count changes (only when count changes)
  useEffect(() => {
    // Strong guards: check all conditions before accessing google.maps
    if (!mapsLoaded) return;
    if (!mapRef.current) return;
    if (typeof window === 'undefined') return;
    if (typeof google === 'undefined') return;
    if (!google.maps) return;
    if (!google.maps.LatLngBounds) return;
    
    // Only fit bounds if location count changed (not on every render)
    if (locationCount === 0) return;
    if (locationCount === prevLocationCount) return; // Skip if same count
    if (locationsWithCoords.length <= 1) return; // Only fit if multiple locations
    
    try {
      const bounds = new google.maps.LatLngBounds();
      locationsWithCoords.forEach(loc => {
        if (loc.coordinates) {
          bounds.extend({
            lat: loc.coordinates.lat,
            lng: loc.coordinates.lng,
          });
        }
      });
      if (mapRef.current && typeof mapRef.current.fitBounds === 'function') {
        mapRef.current.fitBounds(bounds, 50);
      }
    } catch (err) {
      console.warn('FitBounds failed:', err);
    }
  }, [mapsLoaded, locationCount, prevLocationCount]); // Only depend on count, not array

  // Effect 2: Center on selected location (only when selection changes)
  useEffect(() => {
    // Strong guards: check all conditions before accessing google.maps
    if (!mapsLoaded) return;
    if (!mapRef.current) return;
    if (!selectedLocationId) return;
    if (typeof window === 'undefined') return;
    if (typeof google === 'undefined') return;
    if (!google.maps) return;
    
    const selectedLocation = locationsWithCoords.find(loc => loc.id === selectedLocationId);
    if (selectedLocation?.coordinates) {
      try {
        if (mapRef.current && typeof mapRef.current.panTo === 'function') {
          mapRef.current.panTo({
            lat: selectedLocation.coordinates.lat,
            lng: selectedLocation.coordinates.lng,
          });
        }
        if (mapRef.current && typeof mapRef.current.setZoom === 'function') {
          mapRef.current.setZoom(15);
        }
      } catch (err) {
        console.warn('PanTo failed:', err);
      }
    }
  }, [mapsLoaded, selectedLocationId]); // Only depend on selection ID

  const onMapLoad = useCallback((map: google.maps.Map | null) => {
    if (map && typeof map === 'object') {
      mapRef.current = map;
    }
  }, []);

  const onMapUnmount = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();
    mapRef.current = null;
  }, []);

  const handleMarkerClick = useCallback((location: Location) => {
    onMarkerClick?.(location);
    if (infoWindowRef.current) infoWindowRef.current.close();
  }, [onMarkerClick]);

  const handleMarkerLoad = useCallback((marker: google.maps.Marker | null) => {
    if (marker && typeof marker === 'object' && !markersRef.current.includes(marker)) {
      markersRef.current.push(marker);
    }
  }, []);

  // Map options - simple object, no useMemo needed
  const mapOptions = {
    ...DEFAULT_MAP_OPTIONS,
    center: calculatedCenter,
    zoom: zoom,
  };

  if (!mapsLoaded) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={MAP_CONTAINER_STYLE}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={MAP_CONTAINER_STYLE}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Failed to load map</h2>
          <p className="text-muted-foreground">Please check your Google Maps configuration</p>
        </div>
      </div>
    );
  }

  if (locationsWithCoords.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={MAP_CONTAINER_STYLE}>
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold mb-2">No Locations with Coordinates</h2>
          <p className="text-muted-foreground">Add locations with valid coordinates to display them on the map</p>
        </div>
      </div>
    );
  }

  // Final guard: only render GoogleMap if maps are fully loaded and google.maps is available
  if (typeof window === 'undefined' || typeof google === 'undefined' || !google.maps) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={MAP_CONTAINER_STYLE}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={MAP_CONTAINER_STYLE}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        options={mapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      >
        <MarkerClustererF>
          {(clusterer) =>
            locationsWithCoords.map((location) => {
              const isSelected = location.id === selectedLocationId;
              return (
                <Marker
                  key={location.id}
                  position={{
                    lat: location.coordinates!.lat,
                    lng: location.coordinates!.lng,
                  }}
                  icon={getMarkerIcon(isSelected)}
                  title={location.name}
                  onClick={() => handleMarkerClick(location)}
                  onLoad={handleMarkerLoad}
                  clusterer={clusterer}
                  aria-label={`${location.name}, ${location.address || 'No address'}`}
                />
              );
            })
          }
        </MarkerClustererF>
      </GoogleMap>
    </div>
  );
}
