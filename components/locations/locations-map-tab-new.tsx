"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLocations } from '@/hooks/use-locations';
import { Location } from '@/components/locations/location-types';
import { MapView } from '@/components/locations/map-view';
import { useGoogleMaps } from '@/hooks/use-google-maps';
import { useLocationMapData } from '@/hooks/use-location-map-data';
import { useIsMobile } from '@/components/locations/responsive-locations-layout';
import { Loader2, MapPin, Phone, Settings, Eye, Navigation, MessageSquare, FileText, BarChart3, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache';

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
type BrandingVariant = 'cover' | 'logo'

export function LocationsMapTab() {
  // Use stable empty filters object to prevent infinite loops
  const emptyFilters = useMemo(() => ({}), []);
  const { locations, loading, error: locationsError, refetch } = useLocations(emptyFilters);
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const isMobile = useIsMobile();
  const { data: snapshot } = useDashboardSnapshot();
  const router = useRouter();
  
  // Store locations in ref to avoid re-renders
  const locationsRef = useRef<Location[]>([]);
  const brandingFileInputRef = useRef<HTMLInputElement | null>(null);
  const prevLocationCount = usePrevious(locations.length);
  const [pendingVariant, setPendingVariant] = useState<BrandingVariant | null>(null);
  const [uploadingVariant, setBrandingUploadVariant] = useState<BrandingVariant | null>(null);
  
  // Update ref when locations change
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations.length]); // Only depend on length

  // Map View specific logging
  useEffect(() => {
    console.log('🗺️ [MapView] Component state:', {
      loading,
      locationsCount: locations.length,
      isLoaded,
      loadError: loadError?.message,
      locationsError: locationsError?.message,
      timestamp: new Date().toISOString()
    });
  }, [loading, locations.length, isLoaded, loadError, locationsError]);

  // Timeout for loading state (10 seconds)
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
        console.error('❌ [MapView] Locations loading timeout - taking longer than expected', {
          loading,
          locationsCount: locations.length,
          isLoaded,
          loadError: loadError?.message,
          locationsError: locationsError?.message,
          timestamp: new Date().toISOString()
        });
      }, 10000); // 10 seconds

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, locations.length, isLoaded, loadError, locationsError]);

  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log('🔄 [MapView] Loading locations...', { 
        timestamp: new Date().toISOString(),
        hasError: !!locationsError,
        isLoaded,
        loadError: loadError?.message
      });
    } else if (locationsError) {
      console.error('❌ [MapView] Locations error:', {
        message: locationsError.message,
        name: locationsError.name,
        stack: locationsError.stack,
        timestamp: new Date().toISOString()
      });
    } else if (loadError) {
      console.error('❌ [MapView] Google Maps error:', {
        message: loadError.message,
        timestamp: new Date().toISOString()
      });
    } else if (locations.length > 0) {
      console.log('✅ [MapView] Locations loaded:', {
        count: locations.length,
        isLoaded,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('ℹ️ [MapView] No locations found', {
        loading,
        isLoaded,
        timestamp: new Date().toISOString()
      });
    }
  }, [loading, locationsError, locations.length, isLoaded, loadError]);

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
      return null; // No mock coordinates - return null if no valid coordinates
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

  const aggregatedStats = useMemo(() => {
    if (stats) {
      return {
        totalLocations: typeof stats.totalLocations === 'number' ? stats.totalLocations : locations.length,
        avgRating: typeof stats.avgRating === 'number' ? stats.avgRating : 0,
        totalReviews: typeof stats.reviewCount === 'number' ? stats.reviewCount : 0,
        healthScore: typeof stats.healthScore === 'number' ? stats.healthScore : 0,
      };
    }

    if (snapshot) {
      return {
        totalLocations: snapshot.locationSummary.totalLocations ?? locations.length,
        avgRating: snapshot.reviewStats.averageRating ?? 0,
        totalReviews: snapshot.reviewStats.totals.total ?? 0,
        healthScore: snapshot.kpis.healthScore ?? 0,
      };
    }

    if (selectedLocation) {
      const rating = typeof selectedLocation.rating === 'number' ? selectedLocation.rating : 0;
      const reviewCount = typeof selectedLocation.reviewCount === 'number' ? selectedLocation.reviewCount : 0;
      const healthScore = typeof selectedLocation.healthScore === 'number' ? selectedLocation.healthScore : 0;

      return {
        totalLocations: locations.length,
        avgRating: rating,
        totalReviews: reviewCount,
        healthScore,
      };
    }

    return null;
  }, [stats, snapshot, selectedLocation, locations.length]);

  const locationSnapshotStats = useMemo(() => {
    if (!selectedLocation && !aggregatedStats) {
      return { rating: 0, reviewCount: 0, healthScore: 0, responseRate: 0 };
    }

    const rating = stats?.avgRating ?? (typeof selectedLocation?.rating === 'number' ? selectedLocation.rating : aggregatedStats?.avgRating ?? 0);
    const reviewCount = stats?.reviewCount ?? selectedLocation?.reviewCount ?? aggregatedStats?.totalReviews ?? 0;
    const healthScore = stats?.healthScore ?? selectedLocation?.healthScore ?? aggregatedStats?.healthScore ?? 0;
    const responseRate = selectedLocation?.responseRate ?? selectedLocation?.insights?.responseRate ?? snapshot?.reviewStats.responseRate ?? 0;

    return {
      rating,
      reviewCount,
      healthScore,
      responseRate,
    };
  }, [stats, selectedLocation, aggregatedStats, snapshot]);

  const quickActionDisabled = !selectedLocation;

  const handleCall = () => {
    if (selectedLocation?.phone) {
      window.location.href = `tel:${selectedLocation.phone}`;
    }
  };

  const handleDirections = () => {
    if (selectedLocation?.coordinates) {
      const { lat, lng } = selectedLocation.coordinates;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      return;
    }

    if (selectedLocation?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocation.address)}`,
        '_blank'
      );
    }
  };

  const handlePickBrandingFile = (variant: BrandingVariant) => {
    setPendingVariant(variant);
    brandingFileInputRef.current?.click();
  };

  const handleBrandingFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    const variant = pendingVariant;

    if (!file || !variant || !selectedLocation) {
      event.target.value = '';
      return;
    }

    setBrandingUploadVariant(variant);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('variant', variant);

      const response = await fetch(`/api/locations/${selectedLocation.id}/branding`, {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to upload branding image');
      }

      toast.success(variant === 'cover' ? 'Cover photo updated' : 'Logo updated');
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setBrandingUploadVariant(null);
      setPendingVariant(null);
      event.target.value = '';
    }
  };

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

  // Loading state with timeout - only show if we have no locations yet
  if (loading && locations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-2">Loading locations...</p>
            <div className="text-xs text-muted-foreground mb-2">
              <p>Map View Status:</p>
              <p>• Locations: {loading ? 'Loading...' : `${locations.length} found`}</p>
              <p>• Google Maps: {isLoaded ? 'Loaded ✅' : loadError ? `Error: ${loadError.message}` : 'Loading...'}</p>
            </div>
            {loadingTimeout && (
              <div className="mt-4 text-center">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                  ⏱️ This is taking longer than expected
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Debug Info:
                  <br />• Loading: {loading ? 'Yes' : 'No'}
                  <br />• Locations Count: {locations.length}
                  <br />• Google Maps Loaded: {isLoaded ? 'Yes' : 'No'}
                  <br />• Google Maps Error: {loadError ? String(loadError) : 'None'}
                  <br />• Locations Error: {locationsError ? String(locationsError) : 'None'}
                </p>
                <p className="text-xs text-muted-foreground">
                  This might mean:
                  <br />• No locations exist in the database
                  <br />• There's a network issue
                  <br />• The API is slow to respond
                  <br />• Check Console (F12) for detailed logs
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
    console.log('🗺️ [MapView] Google Maps not loaded yet', {
      isLoaded,
      loadError: loadError ? String(loadError) : null,
      locationsCount: locations.length,
      timestamp: new Date().toISOString()
    });
    
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-2">Loading Google Maps...</p>
            <div className="text-xs text-muted-foreground">
              <p>Locations: {locations.length} found</p>
              {loadError && (
                <p className="text-destructive mt-2">Error: {String(loadError)}</p>
              )}
            </div>
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
    <div className="space-y-6">
      <input
        ref={brandingFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleBrandingFileChange}
        className="hidden"
      />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35">
        <div className="h-[360px] md:h-[480px]">
      <MapView
        locations={locationsWithCoords}
        selectedLocationId={selectedLocationId}
        onMarkerClick={handleMarkerClick}
        center={mapCenter || undefined}
        className="absolute inset-0"
      />
              </div>

        {!selectedLocation && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="rounded-2xl border border-white/15 bg-black/80 px-6 py-4 text-center">
              <MapPin className="mx-auto mb-3 h-6 w-6 text-white/70" />
              <h3 className="text-base font-semibold text-white">Select a location</h3>
              <p className="mt-1 text-xs text-white/60">
                Tap any pin on the map to preview details, metrics, and quick actions.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)]">
        <section className="rounded-[24px] border border-white/15 bg-black/40 p-6 backdrop-blur">
          {selectedLocation ? (
            <div className="space-y-6">
              <div className="relative h-48 w-full overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                {selectedLocation.coverImageUrl ? (
                  <Image
                    src={selectedLocation.coverImageUrl}
                    alt={`${selectedLocation.name} cover`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 700px, 100vw"
                    priority={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                    No cover photo — add one in Branding settings
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 bg-black/60 text-white hover:bg-black/80"
                    onClick={() => handlePickBrandingFile('cover')}
                    disabled={uploadingVariant === 'cover'}
                  >
                    {uploadingVariant === 'cover' ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-3.5 w-3.5" />
                    )}
                    {selectedLocation.coverImageUrl ? 'Change cover' : 'Upload cover'}
                  </Button>
                </div>
                <div className="absolute bottom-[-30px] left-6 h-16 w-16 overflow-hidden rounded-full border-2 border-white/40 bg-black/70 shadow-lg flex items-center justify-center">
                  {selectedLocation.logoImageUrl ? (
                    <Image
                      src={selectedLocation.logoImageUrl}
                      alt={`${selectedLocation.name} logo`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-white/70">No logo</span>
                  )}
                </div>
                <div className="absolute bottom-[-45px] left-[95px]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 bg-black/70 text-white hover:bg-black/80"
                    onClick={() => handlePickBrandingFile('logo')}
                    disabled={uploadingVariant === 'logo'}
                  >
                    {uploadingVariant === 'logo' ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-3 w-3" />
                    )}
                    {selectedLocation.logoImageUrl ? 'Change logo' : 'Upload logo'}
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white">{selectedLocation.name}</h2>
                      {selectedLocation.status === 'verified' && (
                        <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                          ✓ Verified
                        </Badge>
                      )}
                      {selectedLocation.category && (
                        <Badge variant="outline" className="border-white/20 text-white/80">
                          {selectedLocation.category}
                        </Badge>
                      )}
                    </div>
                    {selectedLocation.address && (
                      <p className="mt-2 flex items-start gap-2 text-sm text-white/70">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/40" />
                        <span>{selectedLocation.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10" onClick={handleCall} disabled={!selectedLocation.phone}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10" onClick={handleDirections} disabled={!selectedLocation.address && !selectedLocation.coordinates}>
                      <Navigation className="mr-2 h-4 w-4" />
                      Directions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 bg-primary/20 text-white hover:border-white/40 hover:bg-primary/30"
                      onClick={() => router.push(`/locations/${selectedLocation.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                      onClick={() => router.push(`/locations/${selectedLocation.id}/edit`)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="p-4">
                    <p className="text-[0.7rem] font-medium text-white/60">Average rating</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{locationSnapshotStats.rating ? locationSnapshotStats.rating.toFixed(1) : '—'}</p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="p-4">
                    <p className="text-[0.7rem] font-medium text-white/60">Total reviews</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{locationSnapshotStats.reviewCount}</p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="p-4">
                    <p className="text-[0.7rem] font-medium text-white/60">Health score</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{Math.round(locationSnapshotStats.healthScore || 0)}%</p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="p-4">
                    <p className="text-[0.7rem] font-medium text-white/60">Response rate</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{Math.round(locationSnapshotStats.responseRate || 0)}%</p>
                  </CardContent>
                </Card>
              </div>

              {statsLoading && (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Updating live stats…
                </div>
              )}

              {statsError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Couldn’t refresh live stats. Showing cached dashboard numbers instead.
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-white/60">
              <MapPin className="mb-3 h-8 w-8" />
              <h3 className="text-lg font-semibold text-white">No location selected</h3>
              <p className="mt-2 max-w-sm text-sm">
                Choose a pin on the map to preview branding, contact information, and performance metrics.
              </p>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-[24px] border border-white/15 bg-black/35 p-5 backdrop-blur">
            <h3 className="text-sm font-semibold text-white/90">Location quick actions</h3>
            <p className="mb-4 text-xs text-white/60">Workflows open with the currently selected location.</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="flex w-full items-center justify-between border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10"
                onClick={() => selectedLocation && router.push(`/reviews?location=${selectedLocation.id}`)}
                disabled={quickActionDisabled}
              >
                <span className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" /> Reply to reviews
                </span>
                <span className="text-xs text-white/50">Open reviews tab</span>
              </Button>
              <Button
                variant="outline"
                className="flex w-full items-center justify-between border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10"
                onClick={() => selectedLocation && router.push(`/posts?location=${selectedLocation.id}`)}
                disabled={quickActionDisabled}
              >
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" /> Create post
                </span>
                <span className="text-xs text-white/50">Launch composer</span>
              </Button>
              <Button
                variant="outline"
                className="flex w-full items-center justify-between border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10"
                onClick={() => selectedLocation && router.push(`/analytics?location=${selectedLocation.id}`)}
                disabled={quickActionDisabled}
              >
                <span className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" /> View analytics
                </span>
                <span className="text-xs text-white/50">Deep dive on performance</span>
              </Button>
            </div>
            {quickActionDisabled && (
              <p className="mt-3 text-xs text-white/45">Select a location on the map to enable these actions.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
