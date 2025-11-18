"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Download, Grid3x3, List, CheckCircle2, X, Trash2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLocations, LocationFilters } from '@/hooks/use-locations';
import { LocationsStatsCards } from '@/components/locations/locations-stats-cards';
import { LocationFiltersPanel } from '@/components/locations/location-filters-panel';
import { LocationCardV2 } from '@/components/locations/location-card-v2';
import { LocationFormDialog } from '@/components/locations/location-form-dialog';
import { LocationBulkDeleteDialog } from '@/components/locations/location-bulk-delete-dialog';
import { GMBConnectionBanner } from '@/components/locations/gmb-connection-banner';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export function LocationsOverviewTab() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<LocationFilters>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasGmbAccount, setHasGmbAccount] = useState<boolean | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [syncingSelected, setSyncingSelected] = useState(false);

  const { locations, loading, error, total, refetch, hasMore, loadMore } = useLocations(filters);

  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null);

  // Check GMB account on mount
  React.useEffect(() => {
    const checkGMBAccount = async () => {
      try {
        const res = await fetch('/api/gmb/accounts');
        const data = await res.json();
        if (data && data.length > 0) {
          setHasGmbAccount(true);
          // Get the first active account ID
          const activeAccount = data.find((acc: any) => acc.is_active) || data[0];
          if (activeAccount?.id) {
            setGmbAccountId(activeAccount.id);
          }
        } else {
          setHasGmbAccount(false);
          setGmbAccountId(null);
        }
      } catch (error) {
        console.error('Failed to check GMB account:', error);
        setHasGmbAccount(false);
        setGmbAccountId(null);
      }
    };
    checkGMBAccount();
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
        await refetch();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle AbortError specifically (timeout or manual cancellation)
        if (fetchError.name === 'AbortError') {
          // Don't show console.warn - it's expected for long-running operations
          // Only show user-friendly message
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

  const handleBulkSync = async () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select at least one location to sync');
      return;
    }

    try {
      setSyncingSelected(true);
      const response = await fetch('/api/locations/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ locationIds: selectedLocations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Bulk sync failed');
      }

      if (data.failed > 0) {
        toast.warning(data.message, {
          description: `${data.failed} location(s) failed to sync. Check the console for details.`,
        });
      } else {
        toast.success(data.message || `Successfully synced ${data.synced} ${data.synced === 1 ? 'location' : 'locations'}`);
      }

      // Clear selection and refetch
      setSelectedLocations([]);
      await refetch();
    } catch (error) {
      console.error('Bulk sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync selected locations');
    } finally {
      setSyncingSelected(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      // Build export URL with current filters
      const params = new URLSearchParams();
      params.set('format', 'csv');
      
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        params.set('category', filters.category);
      }

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

      toast.success(`Exported ${total} ${total === 1 ? 'location' : 'locations'} successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export locations');
    } finally {
      setExporting(false);
    }
  };

  // Bulk selection handlers
  // ✅ PERFORMANCE: Memoize selection handlers
  const toggleLocationSelection = useCallback((locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allLocationIds = locations.map(loc => loc.id);
    const areAllSelected = allLocationIds.every(id => selectedLocations.includes(id));

    if (areAllSelected) {
      // Deselect all
      setSelectedLocations([]);
    } else {
      // Select all visible locations
      setSelectedLocations(allLocationIds);
    }
  }, [locations, selectedLocations]);

  const clearSelection = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  // Show GMB connection banner if no account
  if (hasGmbAccount === false) {
    return (
      <div className="space-y-6">
        <GMBConnectionBanner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">All Locations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {total} {total === 1 ? 'location' : 'locations'} found
            {selectedLocations.length > 0 && (
              <span className="ml-2">
                <Badge variant="secondary" className="ml-2">
                  {selectedLocations.length} selected
                </Badge>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <>
                <List className="w-4 h-4 mr-2" />
                List
              </>
            ) : (
              <>
                <Grid3x3 className="w-4 h-4 mr-2" />
                Grid
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || loading || total === 0}
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
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <LocationsStatsCards locations={locations} loading={loading} />

      {/* Bulk Selection Bar */}
      {selectedLocations.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedLocations.length} {selectedLocations.length === 1 ? 'location' : 'locations'} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSync}
                  disabled={syncingSelected || selectedLocations.length === 0}
                >
                  {syncingSelected ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4 mr-2" />
                      Sync Selected
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      setExporting(true);
                      const params = new URLSearchParams();
                      params.set('format', 'csv');
                      params.set('locationIds', selectedLocations.join(','));
                      
                      const response = await fetch(`/api/locations/export?${params.toString()}`, {
                        method: 'GET',
                        credentials: 'include',
                      });

                      if (!response.ok) {
                        throw new Error('Export failed');
                      }

                      const csvContent = await response.text();
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      
                      const contentDisposition = response.headers.get('content-disposition');
                      let filename = 'locations-selected-export.csv';
                      if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i);
                        if (filenameMatch) {
                          filename = filenameMatch[1].replace('locations-export-', 'locations-selected-export-');
                        }
                      }
                      
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      toast.success(`Exported ${selectedLocations.length} ${selectedLocations.length === 1 ? 'location' : 'locations'} successfully!`);
                    } catch (error) {
                      console.error('Export selected error:', error);
                      toast.error('Failed to export selected locations');
                    } finally {
                      setExporting(false);
                    }
                  }}
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
                      Export Selected
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <LocationFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        {locations.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={locations.length > 0 && locations.every(loc => selectedLocations.includes(loc.id))}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer select-none"
            >
              Select All
            </label>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive font-medium">Error loading locations</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && locations.length === 0 && (
        <div className={viewMode === 'grid' 
          ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "space-y-4"
        }>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Locations Grid/List */}
      {!loading && locations.length > 0 && (
        <>
          <div className={viewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-4"
          }>
            {locations.map((location) => (
              <LocationCardV2
                key={location.id}
                location={location}
                viewMode={viewMode}
                selected={selectedLocations.includes(location.id)}
                onSelect={() => toggleLocationSelection(location.id)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && locations.length === 0 && !error && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No locations found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {Object.keys(filters).length > 0
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first location'}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Location Dialog */}
      <LocationFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          refetch();
        }}
      />

      {/* Bulk Delete Dialog */}
      <LocationBulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        locationIds={selectedLocations}
        locationCount={selectedLocations.length}
        onSuccess={() => {
          setSelectedLocations([]);
          refetch();
        }}
      />
    </div>
  );
}
