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

  const locationsWithCoords = useMemo(() => {
    return locations.filter(loc => 
      loc.coordinates?.lat &&
      loc.coordinates?.lng &&
      !isNaN(loc.coordinates.lat) &&
      !isNaN(loc.coordinates.lng)
    );
  }, [locationsKey]);

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
    const avgLat = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lat, 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((sum, loc) => 
      sum + loc.coordinates!.lng, 0) / locationsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [center?.lat, center?.lng, locationsKey, locationsWithCoords.length]);

  // ✅ Fix: Add strong guards before using mapRef or google.maps.*
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || typeof google === 'undefined') return;
    if (locationsWithCoords.length > 1) {
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
        mapRef.current.fitBounds(bounds, 50);
      } catch (err) {
        console.warn('FitBounds failed:', err);
      }
    }
  }, [mapsLoaded, locationsKey, locationsWithCoords.length]);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || !selectedLocationId) return;
    const selectedLocation = locationsWithCoords.find(loc => loc.id === selectedLocationId);
    if (selectedLocation?.coordinates) {
      try {
        mapRef.current.panTo({
          lat: selectedLocation.coordinates.lat,
          lng: selectedLocation.coordinates.lng,
        });
        mapRef.current.setZoom(15);
      } catch (err) {
        console.warn('PanTo failed:', err);
      }
    }
  }, [mapsLoaded, selectedLocationId, locationsWithCoords]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
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

  const handleMarkerLoad = useCallback((marker: google.maps.Marker) => {
    if (marker && !markersRef.current.includes(marker)) {
      markersRef.current.push(marker);
    }
  }, []);

  const mapOptions = useMemo(() => ({
    ...DEFAULT_MAP_OPTIONS,
    center: calculatedCenter,
    zoom: zoom,
  }), [calculatedCenter, zoom]);

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

  return (
    <div className={className} style={MAP_CONTAINER_STYLE}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        options={mapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      >
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