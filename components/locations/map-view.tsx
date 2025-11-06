"use client";

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
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
 * MapView Component
 * Displays Google Maps with multiple location markers
 */
export function MapView({
  locations,
  selectedLocationId,
  onMarkerClick,
  center,
  zoom = 10,
  className = '',
}: MapViewProps) {
  // Use shared Google Maps hook to ensure API is loaded only once
  const { isLoaded: mapsLoaded, loadError } = useGoogleMaps();
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Filter locations with valid coordinates
  const locationsWithCoords = useMemo(() => {
    return locations.filter(loc => 
      loc.coordinates?.lat && 
      loc.coordinates?.lng &&
      !isNaN(loc.coordinates.lat) &&
      !isNaN(loc.coordinates.lng)
    );
  }, [locations]);

  // Create stable string key from locations array to avoid infinite loops
  // Calculate this once and use primitive string as dependency
  const locationsKeyString = useMemo(() => {
    return locations
      .filter(loc => loc.coordinates?.lat && loc.coordinates?.lng)
      .map(l => `${l.id}:${l.coordinates?.lat},${l.coordinates?.lng}`)
      .join('|');
  }, [locations]);

  // Calculate center from locations if not provided
  const calculatedCenter = useMemo(() => {
    if (center) return center;
    
    if (locationsWithCoords.length === 0) {
      return { lat: 25.2048, lng: 55.2708 }; // Default: Dubai
    }

    if (locationsWithCoords.length === 1) {
      return {
        lat: locationsWithCoords[0].coordinates!.lat,
        lng: locationsWithCoords[0].coordinates!.lng,
      };
    }

    // Calculate center point from all locations
    const avgLat = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lat, 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lng, 0) / locationsWithCoords.length;

    return { lat: avgLat, lng: avgLng };
  }, [center?.lat, center?.lng, locationsKeyString, locationsWithCoords.length]);

  useEffect(() => {
    if (mapRef.current && locationsWithCoords.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      locationsWithCoords.forEach(loc => {
        if (loc.coordinates) {
          bounds.extend({
            lat: loc.coordinates.lat,
            lng: loc.coordinates.lng,
          });
        }
      });
      
      // Fit bounds with padding (using number for uniform padding)
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [locationsKeyString, locationsWithCoords.length]);

  // Center map on selected location
  useEffect(() => {
    if (mapRef.current && selectedLocationId) {
      const selectedLocation = locationsWithCoords.find(loc => loc.id === selectedLocationId);
      if (selectedLocation?.coordinates) {
        mapRef.current.panTo({
          lat: selectedLocation.coordinates.lat,
          lng: selectedLocation.coordinates.lng,
        });
        mapRef.current.setZoom(15);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Handle map unmount
  const onMapUnmount = useCallback(() => {
    // Cleanup markers
    markersRef.current.forEach(marker => {
      if (marker) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
    
    // Close info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    
    mapRef.current = null;
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback((location: Location) => {
    if (onMarkerClick) {
      onMarkerClick(location);
    }
    
    // Close previous info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, [onMarkerClick]);

  // Handle marker load
  const handleMarkerLoad = useCallback((marker: google.maps.Marker) => {
    if (marker && !markersRef.current.includes(marker)) {
      markersRef.current.push(marker);
    }
  }, []);

  // Map options with dark theme
  const mapOptions = useMemo(() => ({
    ...DEFAULT_MAP_OPTIONS,
    center: calculatedCenter,
    zoom: zoom,
  }), [calculatedCenter, zoom]);

  // Show loading state if Google Maps API is not loaded
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

  // Show error state if Google Maps API failed to load
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

  return (
    <div className={className} style={MAP_CONTAINER_STYLE}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        options={mapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      >
        {/* Render markers for all locations */}
        {locationsWithCoords.map((location) => {
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
              aria-label={`${location.name}, ${location.address || 'No address'}`}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}

