"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/error-boundary';
import { LocationsMapTab } from '@/components/locations/locations-map-tab-new';
import { LocationsStatsCardsAPI } from '@/components/locations/locations-stats-cards-api';
import { LocationsListView } from '@/components/locations/locations-list-view';
import { Button } from '@/components/ui/button';
import { MapPin, List, RefreshCw, Download, Plus, Loader2, MessageSquare, FilePlus2, BarChart3, RefreshCw as RefreshIcon } from 'lucide-react';
import { toast } from 'sonner';
import { LocationFormDialog } from '@/components/locations/location-form-dialog';
import { GMBConnectionBanner } from '@/components/locations/gmb-connection-banner';
import { useGmbStatus } from '@/hooks/use-gmb-status';
import { useIsMobile } from '@/components/locations/responsive-locations-layout';
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
  const t = useTranslations('Locations');
  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState<'map' | 'list'>('map');
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { connected, activeAccount } = useGmbStatus();
  const gmbAccountId = activeAccount?.id || null;
  const { data: overviewSnapshot } = useDashboardSnapshot();
  const recentHighlights = overviewSnapshot?.reviewStats?.recentHighlights ?? [];
 
  const formatHighlightDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const router = useRouter();

  useEffect(() => {
    if (!isMobile) {
      setActivePanel('map');
    }
  }, [isMobile]);

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
          toast.error('Session expired. Please sign in again.');
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
              <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground mt-2">
                {t('subtitle') || 'Manage and monitor all your business locations'}
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
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('subtitle') || 'Manage and monitor all your business locations'}
            </p>
          </div>
          
          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Mobile View Toggle */}
            {isMobile && (
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-primary/20">
                <Button
                  variant={activePanel === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('map')}
                  className={`gap-2 ${activePanel === 'map' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <MapPin className="w-4 h-4" />
                  Map
                </Button>
                <Button
                  variant={activePanel === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('list')}
                  className={`gap-2 ${activePanel === 'list' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
              </div>
            )}
            
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
              onClick={() => setShowAddDialog(true)}
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
        {isMobile ? (
          activePanel === 'map' ? (
            <LocationsMapTab />
          ) : (
            <LocationsListView />
          )
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-background/40 shadow">
                <LocationsMapTab />
              </div>

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
                      recentHighlights.slice(0, 3).map((highlight) => (
                        <div key={highlight.reviewId} className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <div className="text-sm text-white">{highlight.reviewer}</div>
                          <div className="text-xs text-white/60">
                            {formatHighlightDate(highlight.createdAt)}
                          </div>
                          <p className="mt-2 line-clamp-3 text-sm text-white/80">{highlight.locationId}</p>
                        </div>
                      ))
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

            <div>
              <LocationsListView />
            </div>
          </div>
        )}

        {/* Add Location Dialog */}
        <LocationFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={() => {
            setShowAddDialog(false);
            // Refresh the page to update stats
            window.location.reload();
            window.dispatchEvent(new Event('dashboard:refresh'));
            console.log('[LocationsPage] Location added, dashboard refresh triggered');
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
