"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useLocations } from '@/hooks/use-locations';
import { Location } from '@/components/locations/location-types';
import { MapView } from '@/components/locations/map-view';
import { useGoogleMaps } from '@/hooks/use-google-maps';
import { useLocationMapData } from '@/hooks/use-location-map-data';
import {
  Loader2,
  MapPin,
  Phone,
  Settings,
  Eye,
  Navigation,
  MessageSquare,
  FileText,
  BarChart3,
  Upload,
  Star,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  const { data: snapshot } = useDashboardSnapshot();
  const router = useRouter();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiView, setAiView] = useState<'insights' | 'competitors'>('insights');
  const [aiContextLocation, setAiContextLocation] = useState<Location | null>(null);
  
  // Store locations in ref to avoid re-renders
  const locationsRef = useRef<Location[]>([]);
  const brandingFileInputRef = useRef<HTMLInputElement | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const prevLocationCount = usePrevious(locations.length);
  const [pendingVariant, setPendingVariant] = useState<BrandingVariant | null>(null);
  const [uploadingVariant, setBrandingUploadVariant] = useState<BrandingVariant | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedLocationId),
    [locations, selectedLocationId]
  );
  const allLocationIds = useMemo(() => locations.map((loc) => loc.id), [locations]);
  const { stats, loading: statsLoading, error: statsError } = useLocationMapData(selectedLocationId);
  const topPerformers = useMemo(() => {
    return [...locations]
      .filter((location) => (location.rating ?? 0) > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3);
  }, [locations]);

  const attentionLocations = useMemo(() => {
    return locations
      .filter((location) => location.hasIssues)
      .sort((a, b) => ((b.pendingReviews ?? 0) + (b.pendingQuestions ?? 0)) - ((a.pendingReviews ?? 0) + (a.pendingQuestions ?? 0)))
      .slice(0, 3);
  }, [locations]);

  const aiLocation = aiContextLocation ?? selectedLocation ?? null;
  const aiRecommendations = useMemo(() => {
    const suggestions: string[] = [];

    if (aiLocation) {
      if ((aiLocation.pendingReviews ?? 0) > 0) {
        suggestions.push(`Reply to ${aiLocation.pendingReviews} pending reviews for ${aiLocation.name}.`);
      }

      if ((aiLocation.pendingQuestions ?? 0) > 0) {
        suggestions.push(`Answer ${aiLocation.pendingQuestions} open questions to increase trust.`);
      }

      if ((aiLocation.responseRate ?? 0) < 70) {
        suggestions.push('Aim for a response rate above 70% to boost local ranking.');
      }
    }

    if (attentionLocations.length > 0) {
      const attention = attentionLocations[0];
      suggestions.push(`Prioritize ${attention.name} — it has outstanding actions that need attention.`);
    }

    if (topPerformers.length > 0) {
      const top = topPerformers[0];
      suggestions.push(`Use ${top.name} as a playbook — replicate its content cadence and review replies.`);
    }

    return suggestions.slice(0, 4);
  }, [aiLocation, attentionLocations, topPerformers]);

  const resolvedCoverImage = useMemo(() => {
    if (!selectedLocation) return null;
    const metadata = selectedLocation.metadata ?? {};
    const candidates = [
      selectedLocation.coverImageUrl,
      metadata.cover_image_url,
      metadata.coverImageUrl,
      metadata.customBranding?.coverImageUrl,
      metadata.customBranding?.coverUrl,
      metadata.profile?.coverPhotoUrl,
      metadata.profile?.cover_photo_url,
    ];

    return (candidates.find((value) => typeof value === 'string' && value.length > 0) as string | undefined) ?? null;
  }, [selectedLocation]);

  const businessStatus = useMemo(() => deriveBusinessStatus(selectedLocation ?? null), [selectedLocation]);
  const bulkSyncMutation = useMutation({
    mutationFn: async ({ locationIds }: { locationIds: string[] }) => {
      const response = await fetch('/api/locations/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationIds }),
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to initiate sync');
      }

      return response.json();
    },
  });

  const {
    data: competitorsResponse,
    isFetching: competitorsLoading,
    refetch: refetchCompetitors,
  } = useQuery({
    queryKey: ['competitors', aiContextLocation?.id],
    queryFn: async () => {
      if (!aiContextLocation?.coordinates) {
        return { competitors: [] };
      }

      const { lat, lng } = aiContextLocation.coordinates;
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
      });

      const response = await fetch(`/api/locations/competitors?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to load competitors');
      }

      return response.json();
    },
    enabled: aiPanelOpen && aiView === 'competitors' && Boolean(aiContextLocation?.coordinates),
    staleTime: 1000 * 60 * 5,
  });

  const competitors = useMemo(() => {
    if (!competitorsResponse || Array.isArray(competitorsResponse)) {
      return competitorsResponse ?? [];
    }
    return (competitorsResponse.competitors as Array<Record<string, any>>) ?? [];
  }, [competitorsResponse]);

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

  const quickActionDisabled = !selectedLocation;

  const handleCall = () => {
    if (selectedLocation?.phone) {
      window.open(`tel:${selectedLocation.phone}`, '_self');
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

  const openAiPanel = useCallback(
    (contextLocation?: Location | null, view: 'insights' | 'competitors' = 'insights') => {
      const fallbackLocation = contextLocation ?? locations.find((loc) => loc.id === selectedLocationId) ?? locations[0] ?? null;
      if (!fallbackLocation) {
        toast.info('Add a location first to generate AI insights.');
        return;
      }

      setAiContextLocation(fallbackLocation);
      setAiView(view);
      setAiPanelOpen(true);
    },
    [locations, selectedLocationId]
  );

  const handleEditLocation = useCallback(
    (location: Location | null | undefined) => {
      if (!location) {
        toast.info('Select a location first to edit its details.');
        return;
      }

      window.dispatchEvent(
        new CustomEvent('location:edit', {
          detail: {
            id: location.id,
            location,
          },
        })
      );
    },
    []
  );

  const handleScrollToDetails = useCallback(
    (locationId: string) => {
      setSelectedLocationId(locationId);
      requestAnimationFrame(() => {
        detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [setSelectedLocationId]
  );

  const handleBulkSync = useCallback(async () => {
    if (!allLocationIds.length) {
      toast.info('No locations to sync yet.');
      return;
    }

    try {
      toast.loading('Syncing locations...', { id: 'bulk-sync' });
      await bulkSyncMutation.mutateAsync({ locationIds: allLocationIds });
      toast.success('Sync started for your locations.', { id: 'bulk-sync' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync locations right now.';
      toast.error(message, { id: 'bulk-sync' });
    }
  }, [allLocationIds, bulkSyncMutation]);

  const handleHeatmapView = useCallback(() => {
    router.push('/analytics?view=heatmap');
  }, [router]);

  const handleBulkAnalytics = useCallback(() => {
    router.push('/analytics?mode=bulk');
  }, [router]);

  const handleShowCompetitors = useCallback(() => {
    const context = selectedLocation ?? locations[0];
    if (!context) {
      toast.info('Select a location to see competitors.');
      return;
    }

    if (!context.coordinates) {
      toast.info('Connect Google Maps coordinates to explore competitors.');
      return;
    }

    openAiPanel(context, 'competitors');
  }, [locations, openAiPanel, selectedLocation]);

  useEffect(() => {
    if (aiPanelOpen && aiView === 'competitors' && aiContextLocation?.coordinates) {
      refetchCompetitors();
    }
  }, [aiPanelOpen, aiView, aiContextLocation, refetchCompetitors]);
  
  // Update ref when locations change
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations.length]); // Only depend on length

  useEffect(() => {
    const handleLocationSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const nextId = customEvent.detail?.id;
      if (nextId) {
        setSelectedLocationId(nextId);
      }
    };

    window.addEventListener('location:select', handleLocationSelect as EventListener);
    return () => {
      window.removeEventListener('location:select', handleLocationSelect as EventListener);
    };
  }, []);

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
  const { data: locationStatsResponse, isFetching: locationStatsLoading } = useQuery({
    queryKey: ['location-stats', selectedLocationId],
    queryFn: async () => {
      if (!selectedLocationId) return null;
      const response = await fetch(`/api/locations/${selectedLocationId}/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to load location stats');
      }

      return response.json();
    },
    enabled: Boolean(selectedLocationId),
    staleTime: 1000 * 30,
  });

  const locationStats = locationStatsResponse?.data ?? locationStatsResponse ?? null;
  const pendingReviews = locationStats?.pendingReviews ?? selectedLocation?.pendingReviews ?? 0;
  const pendingQuestions = locationStats?.pendingQuestions ?? selectedLocation?.pendingQuestions ?? 0;
  const lastReviewAt = locationStats?.lastReviewAt ?? selectedLocation?.lastReviewAt ?? null;
  const lastReviewRelative = useMemo(() => {
    if (!lastReviewAt) return 'No recent reviews';
    const date = new Date(lastReviewAt);
    if (Number.isNaN(date.getTime())) {
      return 'No recent reviews';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  }, [lastReviewAt]);

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35">
            <button
              type="button"
              onClick={() => openAiPanel(selectedLocation, 'insights')}
              className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              AI Insights
            </button>
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

          <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-zinc-800/60 bg-zinc-950/80 p-4 shadow-lg">
            <Button
              onClick={handleBulkSync}
              disabled={bulkSyncMutation.isPending}
              className="flex items-center gap-2 bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              {bulkSyncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '🔄'
              )}
              <span>Sync All Locations</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleHeatmapView}
              className="flex items-center gap-2 border-orange-600/60 px-4 py-2 text-sm text-orange-300 transition hover:bg-orange-600/10"
            >
              🗺️ Heat Map View
            </Button>

            <Button
              variant="outline"
              onClick={handleShowCompetitors}
              className="flex items-center gap-2 border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
            >
              👁️ Show Competitors
            </Button>

            <Button
              variant="outline"
              onClick={handleBulkAnalytics}
              className="flex items-center gap-2 border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
            >
              📊 Bulk Analytics
            </Button>
          </div>

          <section
            id="location-detail-card"
            ref={detailSectionRef}
            className="rounded-[24px] border border-white/15 bg-black/40 p-6 backdrop-blur"
          >
            {selectedLocation ? (
              <div className="space-y-6">
                <div className="relative h-48 w-full overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                  {resolvedCoverImage ? (
                    <Image
                      src={resolvedCoverImage}
                      alt={`${selectedLocation.name} cover`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 700px, 100vw"
                      priority={false}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
                      <button
                        type="button"
                        onClick={() => handlePickBrandingFile('cover')}
                        disabled={uploadingVariant === 'cover'}
                        className="flex items-center gap-2 rounded-lg border-2 border-dashed border-orange-500/60 px-4 py-2 text-sm font-medium text-orange-300 transition hover:border-orange-400 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingVariant === 'cover' ? <Loader2 className="h-4 w-4 animate-spin" /> : '📷'}
                        <span>Upload Cover Image</span>
                      </button>
                      <p className="text-xs text-white/60">Add a hero image to showcase your location.</p>
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
                      {resolvedCoverImage ? 'Change cover' : 'Upload cover'}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                        onClick={handleCall}
                        disabled={!selectedLocation.phone}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                        onClick={handleDirections}
                        disabled={!selectedLocation.address && !selectedLocation.coordinates}
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Directions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 bg-primary/20 text-white hover:border-white/40 hover:bg-primary/30"
                        onClick={() => router.push(`/analytics?location=${selectedLocation.id}`)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View analytics
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                        onClick={() => handleEditLocation(selectedLocation)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                {locationStatsLoading && (
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Updating pending actions…
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase text-white/60">Business status</p>
                    <p className="mt-2 text-sm font-semibold text-white">{businessStatus.statusText}</p>
                    <p className="text-xs text-white/60">{businessStatus.summary}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase text-white/60">Pending reviews</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{pendingReviews}</p>
                    <p className="text-xs text-white/60">Reviews awaiting your response</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase text-white/60">Pending questions</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{pendingQuestions}</p>
                    <p className="text-xs text-white/60">Questions that need answers</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Last review</span>
                    <span className="text-xs text-white/60">{lastReviewRelative}</span>
                  </div>
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
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-white/60">
                <MapPin className="mb-3 h-8 w-8" />
                <h3 className="text-lg font-semibold text-white">No location selected</h3>
                <p className="mt-2 max-w-sm text-sm">Choose a pin on the map to preview branding and performance details.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="flex h-full flex-col rounded-[24px] border border-white/15 bg-black/40 p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/90">Locations</h3>
            <span className="text-xs text-white/50">{locations.length} total</span>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '480px' }}>
            {locations.map((location) => {
              const rating = location.rating != null && !Number.isNaN(location.rating)
                ? location.rating.toFixed(1)
                : 'N/A';
              const reviewCount = location.reviewCount ?? 0;
              const responseRateValue = location.responseRate ?? location.insights?.responseRate ?? 0;
              const responseRateDisplay = Number.isFinite(responseRateValue)
                ? Math.round(Number(responseRateValue))
                : 0;
              const isSelected = selectedLocationId === location.id;
              const addressLine = location.address ?? 'No address available';
              const statusLabel = location.isActive === false
                ? { label: '🔴 Inactive', tone: 'text-red-400' }
                : location.hasIssues
                ? { label: '🟡 Needs attention', tone: 'text-amber-400' }
                : { label: '🟢 Active', tone: 'text-green-400' };

              return (
                <div
                  key={location.id}
                  className={cn(
                    'rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white transition-colors',
                    isSelected && 'border-primary/50 bg-primary/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{location.name}</p>
                        <span className={cn('text-xs font-medium', statusLabel.tone)}>{statusLabel.label}</span>
                      </div>
                      <div className="space-y-1 text-xs text-white/70">
                        <p>⭐ {rating} ({reviewCount} reviews)</p>
                        <p>💬 Response rate: {responseRateDisplay}%</p>
                        <p>📍 {addressLine}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={cn('text-xs', badgeTone(location.status))}>
                        {location.status === 'verified' ? 'Verified' : location.status === 'suspended' ? 'Suspended' : 'Pending'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => openAiPanel(location, 'insights')}
                        className="text-xs font-medium text-purple-400 transition hover:text-purple-300"
                      >
                        🤖 AI Optimize
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'ghost'}
                      className="text-white/80 hover:text-white"
                      onClick={() => setSelectedLocationId(location.id)}
                    >
                      {isSelected ? 'Selected' : 'Focus on map'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => handleScrollToDetails(location.id)}
                    >
                      View details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              className="flex w-full items-center justify-between border-white/10 bg-white/5 text-white hover-border-white/25 hover:bg-white/10"
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

        <section className="rounded-[24px] border border-white/15 bg-black/35 p-5 backdrop-blur">
          <h3 className="text-sm font-semibold text-white/90">Location stats snapshot</h3>
          <p className="mb-4 text-xs text-white/60">Overview of performance across your locations.</p>
          <div className="grid grid-cols-2 gap-3 text-sm text-white">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/50">Total locations</p>
              <p className="mt-2 text-xl font-semibold">{locations.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/50">Average rating</p>
              <p className="mt-2 text-xl font-semibold">{selectedLocation?.rating?.toFixed(1) ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/50">Total reviews</p>
              <p className="mt-2 text-xl font-semibold">{selectedLocation?.reviewCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/50">Avg health score</p>
              <p className="mt-2 text-xl font-semibold">{selectedLocation?.healthScore ?? 0}%</p>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <DialogContent className="max-w-3xl border border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Insights
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-6 py-1">
              {aiLocation && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{aiLocation.name}</p>
                      <p className="text-xs text-white/60">{aiLocation.address ?? 'No address on file'}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-xs', badgeTone(aiLocation.status))}>
                      {aiLocation.status === 'verified' ? 'Verified' : aiLocation.status === 'suspended' ? 'Suspended' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant={aiView === 'insights' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAiView('insights')}
                >
                  Insights
                </Button>
                <Button
                  variant={aiView === 'competitors' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAiView('competitors')}
                >
                  Competitors
                </Button>
              </div>

              {aiView === 'insights' ? (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Top performers</h4>
                    <div className="mt-2 space-y-2">
                      {topPerformers.length > 0 ? (
                        topPerformers.map((location) => (
                          <div key={location.id} className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-white">{location.name}</span>
                              <span className="text-white/60">⭐ {location.rating?.toFixed(1) ?? '—'}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-white/60">
                              <span>Reviews: {location.reviewCount ?? 0}</span>
                              <span>Response: {Math.round(location.responseRate ?? 0)}%</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-white/60">Add more activity to surface performance leaders.</p>
                      )}
                    </div>
                  </div>

                  <Separator className="border-white/10" />

                  <div>
                    <h4 className="text-sm font-semibold text-white">Needs attention</h4>
                    <div className="mt-2 space-y-2">
                      {attentionLocations.length > 0 ? (
                        attentionLocations.map((location) => (
                          <div key={location.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-white">{location.name}</span>
                              <span className="text-amber-200">🟡 {location.pendingReviews ?? 0} reviews · {location.pendingQuestions ?? 0} questions</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-white hover:bg-white/10"
                                onClick={() => {
                                  setSelectedLocationId(location.id);
                                  setAiPanelOpen(false);
                                }}
                              >
                                Focus this location
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-purple-300 hover:text-purple-200"
                                onClick={() => openAiPanel(location, 'competitors')}
                              >
                                Compare competitors
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-white/60">No locations require urgent attention.</p>
                      )}
                    </div>
                  </div>

                  <Separator className="border-white/10" />

                  <div>
                    <h4 className="text-sm font-semibold text-white">Recommended next steps</h4>
                    <ul className="mt-2 space-y-2 text-xs text-white/70">
                      {aiRecommendations.length > 0 ? (
                        aiRecommendations.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-white/60">Keep up the great work — AI will surface new opportunities soon.</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">Nearby competitors</h4>
                    {competitorsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  <div className="space-y-3">
                    {!competitorsLoading && competitors.length === 0 && (
                      <p className="text-xs text-white/60">No competitor data found for this location. Try syncing or adjusting the radius.</p>
                    )}
                    {competitors.map((competitor: any) => (
                      <div key={competitor.placeId ?? competitor.name} className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-white">{competitor.name}</p>
                            <p className="text-white/60">{competitor.address ?? competitor.vicinity ?? 'No address provided'}</p>
                          </div>
                          <div className="text-right text-white/70">
                            <p>⭐ {competitor.rating ?? '—'}</p>
                            <p>{competitor.userRatingsTotal ?? 0} reviews</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-white/60">Status: {competitor.businessStatus ?? 'Unknown'}</span>
                          {competitor.openNow != null && (
                            <span className="text-xs text-white/60">
                              {competitor.openNow ? '🟢 Open now' : '🔴 Closed'}
                            </span>
                          )}
                          {competitor.placeId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-white hover:bg-white/10"
                              onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${competitor.placeId}`, '_blank')}
                            >
                              View on Maps
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function deriveBusinessStatus(location: Location | null) {
  if (!location) {
    return {
      statusText: '⚪ Hours unavailable',
      summary: 'Connect your business hours to keep customers informed.',
    };
  }

  const metadata = location.metadata ?? {};
  const openInfo = metadata.openInfo ?? metadata.open_info ?? {};
  const regularHours =
    metadata.businessHours ??
    metadata.business_hours ??
    metadata.regularHours ??
    metadata.regular_hours ??
    {};

  let isOpen: boolean | null = null;
  if (typeof openInfo.openNow === 'boolean') {
    isOpen = openInfo.openNow;
  } else if (typeof openInfo.status === 'string') {
    const normalized = openInfo.status.toUpperCase();
    if (normalized.includes('OPEN')) {
      isOpen = true;
    } else if (normalized.includes('CLOSED')) {
      isOpen = false;
    }
  }

  const statusText = isOpen === true ? '🟢 Open now' : isOpen === false ? '🔴 Closed' : '⚪ Hours unavailable';

  let summary = '';
  if (Array.isArray(regularHours.weekdayDescriptions) && regularHours.weekdayDescriptions.length > 0) {
    summary = regularHours.weekdayDescriptions.slice(0, 2).join(' · ');
  } else if (Array.isArray(regularHours.periods)) {
    const now = new Date();
    const todayShort = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const todayLong = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

    const todaysPeriods = regularHours.periods.filter((period: any) => {
      const openDay = (period.openDay ?? period.open_day ?? '').toString().toUpperCase();
      return openDay === todayLong || openDay === todayShort;
    });

    if (todaysPeriods.length > 0) {
      const period = todaysPeriods[0];
      if (period.openTime && period.closeTime) {
        const openTime = formatPeriodTime(period.openTime);
        const closeTime = formatPeriodTime(period.closeTime);
        summary = `Today: ${openTime} - ${closeTime}`;
      } else {
        summary = 'Today: Open 24 hours';
      }
    }
  }

  if (!summary) {
    summary = 'No business hours data available.';
  }

  return { statusText, summary };
}

function formatPeriodTime(time: { hours?: number; minutes?: number } | Record<string, any>) {
  if (!time) return '--';
  const hoursCandidate = typeof time.hours === 'number'
    ? time.hours
    : typeof (time as Record<string, any>).hour === 'number'
    ? (time as Record<string, any>).hour
    : 0;
  const minutesCandidate = typeof time.minutes === 'number'
    ? time.minutes
    : typeof (time as Record<string, any>).minute === 'number'
    ? (time as Record<string, any>).minute
    : 0;
  const hours = Number(hoursCandidate);
  const minutes = Number(minutesCandidate);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function badgeTone(status: Location['status']) {
  switch (status) {
    case 'verified':
      return 'border-emerald-500/30 text-emerald-200';
    case 'suspended':
      return 'border-destructive/30 text-destructive';
    default:
      return 'border-amber-400/30 text-amber-300';
  }
}
