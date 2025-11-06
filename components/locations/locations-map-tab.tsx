"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocations } from '@/hooks/use-locations';
import { Location } from '@/components/locations/location-types';
import { Loader2, MapPin, ZoomIn, ZoomOut, Maximize2, Star, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useRouter } from '@/lib/navigation';
import { getStatusColor } from '@/components/locations/location-types';
import { useGoogleMaps } from '@/hooks/use-google-maps';

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const libraries: ("places" | "drawing" | "geometry" | "visualization" | "marker")[] = ['places'];

// Dark map theme
const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#b3d4f8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b3961' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#445b8a' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', stylers: [{ color: '#28385e' }] },
];

export function LocationsMapTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { locations, loading } = useLocations({});
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(10);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (loadError) {
      console.error('Failed to load Google Maps:', loadError);
      toast.error('Failed to load Google Maps configuration');
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadError]);

  // Calculate map center from locations - no mock data
  const calculatedCenter = useMemo(() => {
    const locationsWithCoords = locations.filter(loc => 
      loc.coordinates?.lat && loc.coordinates?.lng
    );

    if (locationsWithCoords.length === 0) {
      return null; // No mock coordinates - return null if no valid locations
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
  }, [locations]);

  // Set initial center
  useEffect(() => {
    if (!mapCenter && calculatedCenter) {
      setMapCenter(calculatedCenter);
    }
  }, [calculatedCenter, mapCenter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, []);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || mapZoom;
      mapRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || mapZoom;
      mapRef.current.setZoom(currentZoom - 1);
    }
  };

  // Filter locations with coordinates
  const locationsWithCoords = useMemo(() => {
    return locations.filter(loc => 
      loc.coordinates?.lat && loc.coordinates?.lng
    );
  }, [locations]);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Map View</CardTitle>
            <Badge variant="secondary">
              {locationsWithCoords.length} {locationsWithCoords.length === 1 ? 'location' : 'locations'} on map
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter || calculatedCenter}
              zoom={mapZoom}
              onLoad={onMapLoad}
              options={{
                styles: theme === 'dark' ? darkMapStyles : undefined,
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
              }}
            >
              {/* Markers */}
              {locationsWithCoords.map((location: Location) => (
                <Marker
                  key={location.id}
                  position={{
                    lat: location.coordinates!.lat,
                    lng: location.coordinates!.lng,
                  }}
                  onClick={() => setSelectedLocation(location)}
                  title={location.name}
                />
              ))}

              {/* Info Window */}
              {selectedLocation && selectedLocation.coordinates && (
                <InfoWindow
                  position={{
                    lat: selectedLocation.coordinates.lat,
                    lng: selectedLocation.coordinates.lng,
                  }}
                  onCloseClick={() => {
                    setSelectedLocation(null);
                    if (infoWindowRef.current) {
                      infoWindowRef.current = null;
                    }
                  }}
                  onLoad={(infoWindow: google.maps.InfoWindow) => {
                    infoWindowRef.current = infoWindow;
                  }}
                >
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-sm mb-2">{selectedLocation.name}</h4>
                    
                    {selectedLocation.address && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{selectedLocation.address}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                      {selectedLocation.rating !== undefined && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          <span className="text-xs font-medium">{selectedLocation.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {selectedLocation.reviewCount !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {selectedLocation.reviewCount} reviews
                        </span>
                      )}
                    </div>

                    {selectedLocation.healthScore !== undefined && (
                      <div className="mb-2">
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          Health: {selectedLocation.healthScore}%
                        </Badge>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(`/locations/${selectedLocation.id}`);
                          setSelectedLocation(null);
                        }}
                        className="text-xs h-7"
                      >
                        View Details
                      </Button>
                      {selectedLocation.address && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocation.address!)}`,
                              '_blank'
                            );
                          }}
                          className="text-xs h-7 px-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Custom Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomIn}
                className="h-9 w-9 shadow-lg"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomOut}
                className="h-9 w-9 shadow-lg"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Map Info */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <p>
              Showing {locationsWithCoords.length} of {locations.length} locations
              {locations.length > locationsWithCoords.length && (
                <span className="ml-1">(some locations missing coordinates)</span>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (mapRef.current && mapCenter) {
                  mapRef.current.setCenter(mapCenter);
                  mapRef.current.setZoom(10);
                }
              }}
            >
              <Maximize2 className="w-3 h-3 mr-2" />
              Reset View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>Locations on Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer
                  ${selectedLocation?.id === location.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted/50'
                  }
                `}
                onClick={() => {
                  if (location.coordinates) {
                    setSelectedLocation(location);
                    if (mapRef.current) {
                      mapRef.current.setCenter({
                        lat: location.coordinates.lat,
                        lng: location.coordinates.lng,
                      });
                      mapRef.current.setZoom(15);
                    }
                  } else {
                    toast.info('Location coordinates not available');
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`
                    w-3 h-3 rounded-full flex-shrink-0
                    ${location.coordinates 
                      ? 'bg-primary' 
                      : 'bg-muted'
                    }
                  `} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{location.name}</p>
                    {location.address && (
                      <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                    )}
                  </div>
                </div>
                {location.coordinates && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedLocation(location);
                      if (mapRef.current && location.coordinates) {
                        mapRef.current.setCenter({
                          lat: location.coordinates.lat,
                          lng: location.coordinates.lng,
                        });
                        mapRef.current.setZoom(15);
                      }
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}