"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LocationsMapTab } from '@/components/locations/locations-map-tab-new';
import { LocationsStatsCardsAPI } from '@/components/locations/locations-stats-cards-api';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Plus, Loader2, MessageSquare, FilePlus2, BarChart3, RefreshCw as RefreshIcon } from 'lucide-react';
import { toast } from 'sonner';
import { LocationFormDialog } from '@/components/locations/location-form-dialog';
import { Location } from '@/components/locations/location-types';
import { GMBConnectionBanner } from '@/components/locations/gmb-connection-banner';
import { useGmbStatus } from '@/hooks/use-gmb-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache';
import { useRouter } from 'next/navigation';

const QuickActionButton = ({ icon: Icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <Button
    variant="outline"
    className="flex w-full items-center justify-center gap-2 border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
    onClick={onClick}
  >
    {Icon}
    {label}
  </Button>
);

export default function LocationsPage() {
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationData, setEditingLocationData] = useState<Partial<Location> | null>(null);
  const { connected, activeAccount } = useGmbStatus();
  const gmbAccountId = activeAccount?.id || null;
  const { data: overviewSnapshot } = useDashboardSnapshot();
  const recentHighlights = overviewSnapshot?.reviewStats?.recentHighlights ?? [];

  const locationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (overviewSnapshot?.locationSummary?.locations) {
      overviewSnapshot.locationSummary.locations.forEach((loc) => {
        if (loc?.id) {
          map.set(loc.id, loc.name ?? 'Untitled location');
        }
      });
    }
    return map;
  }, [overviewSnapshot]);
 
  const formatHighlightDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const router = useRouter();

  useEffect(() => {
    const handleLocationEdit = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; location?: Partial<Location> }>;
      const nextId = customEvent.detail?.id;
      if (!nextId) return;

      setEditingLocationId(nextId);
      setEditingLocationData(customEvent.detail?.location ?? null);
      setShowAddDialog(true);
    };

    window.addEventListener('location:edit', handleLocationEdit as EventListener);
    return () => {
      window.removeEventListener('location:edit', handleLocationEdit as EventListener);
    };
  }, []);

  const handleAddLocationClick = useCallback(() => {
    setEditingLocationId(null);
    setEditingLocationData(null);
    setShowAddDialog(true);
  }, []);

  const handleSync = async () => {
    // Check if account ID is available
    if (!gmbAccountId) {
      console.warn('Sync attempted but gmbAccountId is null/undefined');
      toast.error('No GMB account found. Please connect a GMB account first.');
      return;
    }

    // Prevent multiple concurrent syncs
    if (syncing) {
      toast.info('Sync already in progress');
      return;
    }

    console.log('Starting sync for account:', gmbAccountId);

    try {
      setSyncing(true);
      
      // Sync can take a while (locations, reviews, media, metrics, etc.)
      // Increase timeout to 3 minutes (180 seconds) for full sync
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout
      
      // Show info message that sync is starting (takes time)
      toast.info('Sync started. This may take a few minutes...', { duration: 3000 });
      
      try {
        const requestBody = { 
          accountId: gmbAccountId,
          syncType: 'full' 
        };
        
        console.log('Sync request body:', requestBody);
        
        const response = await fetch('/api/gmb/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle specific HTTP error codes
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || 'Session expired';
          
          if (errorMessage.includes('expired') || errorMessage.includes('reconnect')) {
            toast.error('🔗 Google connection expired. Go to Settings → Connect Google Account to reconnect.', {
              duration: 8000,
              action: {
                label: 'Go to Settings',
                onClick: () => window.location.href = '/settings'
              }
            });
          } else {
            toast.error('Session expired. Please sign in again.');
          }
          return;
        }
        
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || 'Bad request';
          console.error('Sync API error (400):', {
            errorData,
            requestBody,
            accountId: gmbAccountId
          });
          toast.error(`Sync failed: ${errorMessage}`);
          return;
        }
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          toast.error(`Rate limit exceeded. Try again in ${retryAfter || 60} seconds.`);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `Sync failed with status ${response.status}`);
        }

        const data = await response.json();
        const tookSeconds = Math.round((data.took_ms || 0) / 1000);
        toast.success(`Locations synced successfully! (took ${tookSeconds}s)`);
        window.dispatchEvent(new Event('dashboard:refresh'));
        console.log('[LocationsPage] Locations synced, dashboard refresh triggered');
        
        // Refresh the page to update stats
        window.location.reload();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle AbortError specifically (timeout or manual cancellation)
        if (fetchError.name === 'AbortError') {
          toast.error('Sync timed out. The operation may still be processing. Please wait a moment and refresh the page.');
          return;
        }
        
        // Re-throw other errors to be handled by outer catch
        throw fetchError;
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Already handled in inner catch
          return;
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          toast.error('Network error. Please check your internet connection.');
        } else {
          toast.error(error.message || 'Failed to sync locations');
        }
      } else {
        toast.error('An unexpected error occurred during sync');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      // Build export URL
      const params = new URLSearchParams();
      params.set('format', 'csv');

      const response = await fetch(`/api/locations/export?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        // Handle error response
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 404) {
          throw new Error('No locations found to export.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to export locations');
        }
      }

      // Get CSV content
      const csvContent = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'locations-export.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Locations exported successfully!');
      window.dispatchEvent(new Event('dashboard:refresh'));
      console.log('[LocationsPage] Locations exported, dashboard refresh triggered');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export locations');
    } finally {
      setExporting(false);
    }
  };

  // Show GMB connection banner if no account
  if (connected === false) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground mt-2">
              Manage and monitor all your business locations
            </p>
          </div>
          </div>
          <GMBConnectionBanner />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground mt-2">
              Manage and monitor all your business locations
            </p>
          </div>
          
          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            
            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            
            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
            
            {/* Add Location Button */}
            <Button
              onClick={handleAddLocationClick}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Stats Cards - Always Visible */}
        <LocationsStatsCardsAPI />

        {/* Main Content Area */}
        <div className="space-y-6">
          <LocationsMapTab />
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <CardDescription className="text-xs text-white/60">
                  Latest highlights from synced reviews.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-white/80">
                {recentHighlights.length === 0 ? (
                  <>
                    <p>No recent highlights yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-dashed border-white/20 text-white hover:border-white/40 hover:bg-white/10"
                      onClick={handleSync}
                    >
                      <RefreshIcon className="mr-2 h-4 w-4" />
                      Run sync
                    </Button>
                  </>
                ) : (
                  recentHighlights.slice(0, 3).map((highlight) => {
                    const locationName = locationNameMap.get(highlight.locationId) ?? 'Unknown location';
                    const ratingValue = typeof highlight.rating === 'number' ? highlight.rating.toFixed(1) : null;
                    const reviewerName = highlight.reviewer || 'Recent review';
                    const isPositive = typeof highlight.rating === 'number' ? highlight.rating >= 4 : true;
                    const message = isPositive
                      ? 'Great feedback! Reply to keep the momentum going.'
                      : 'Review needs attention. Consider replying soon.';

                    return (
                      <div
                        key={highlight.reviewId}
                        className="rounded-xl border border-white/10 bg-black/40 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-white line-clamp-1" title={locationName}>
                            {locationName}
                          </div>
                          {ratingValue && (
                            <span className="flex items-center gap-1 text-xs text-yellow-400">
                              <span>⭐</span>
                              {ratingValue}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          by {reviewerName} · {formatHighlightDate(highlight.createdAt)}
                        </div>
                        <p className="mt-2 text-xs text-white/70">{message}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 h-8 w-full justify-start border border-white/10 bg-white/5 text-xs text-white hover:border-white/20 hover:bg-white/10"
                          onClick={() => router.push(`/reviews?location=${highlight.locationId}`)}
                        >
                          <MessageSquare className="mr-2 h-3.5 w-3.5" />
                          Open in Reviews
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                <CardDescription className="text-xs text-white/60">
                  Jump into everyday workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <QuickActionButton
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Reply to Reviews"
                  onClick={() => router.push('/reviews')}
                />
                <QuickActionButton
                  icon={<FilePlus2 className="h-4 w-4" />}
                  label="Create Post"
                  onClick={() => router.push('/posts')}
                />
                <QuickActionButton
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="View Analytics"
                  onClick={() => router.push('/analytics')}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Location Dialog */}
        <LocationFormDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingLocationId(null);
              setEditingLocationData(null);
            }
          }}
          onSuccess={() => {
            setShowAddDialog(false);
            setEditingLocationId(null);
            setEditingLocationData(null);
            window.location.reload();
            window.dispatchEvent(new Event('dashboard:refresh'));
            console.log('[LocationsPage] Location added, dashboard refresh triggered');
          }}
          locationId={editingLocationId}
          initialData={editingLocationData}
        />
      </div>
    </ErrorBoundary>
  );
}
