"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Layers } from 'lucide-react';
import { toast } from 'sonner';

// Import optimized components
import { LocationsSection } from '@/components/locations/locations-error-boundary';
import { 
  useIsMobile, 
  useResponsiveGrid,
  MobileLocationsToolbar,
  MobileFiltersDrawer,
  ResponsiveStatsGrid
} from '@/components/locations/responsive-locations-layout';
import { 
  useLocationsData, 
  useLocationsStats, 
  locationsCacheUtils 
} from '@/hooks/use-locations-cache';
import { 
  Location as LocationType, 
  formatLargeNumber
} from '@/components/locations/location-types';
import { EnhancedLocationCard, EnhancedLocationCardSkeleton } from '@/components/locations/enhanced-location-card';
import { LocationsStats } from '@/components/locations/locations-stats';
import { LocationsFilters } from '@/components/locations/locations-filters';
import { GMBConnectionBanner, EmptyLocationsState } from '@/components/locations/gmb-connection-banner';
import { LocationsErrorAlert } from '@/components/locations/locations-error-alert';

// Main Optimized Locations Page
export default function LocationsPage() {
  const t = useTranslations('Locations');
  const router = useRouter();
  const isMobile = useIsMobile();
  const gridCols = useResponsiveGrid();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [hasGmbAccount, setHasGmbAccount] = useState<boolean | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data fetching with caching
  const filters = { 
    search: searchTerm || undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined
  };

  const { data: locationsData, loading, error, refetch: refetchLocations } = useLocationsData(filters);
  const { data: statsData, loading: statsLoading } = useLocationsStats();

  const locations = locationsData?.data || [];
  const totalCount = locationsData?.total || 0;

  // Check GMB account on mount
  useEffect(() => {
    const checkGMBAccount = async () => {
      try {
        const accountRes = await fetch('/api/gmb/accounts');
        const accountData = await accountRes.json();
        const hasAccount = accountData && accountData.length > 0;
        setHasGmbAccount(hasAccount);
      } catch (error) {
        console.error('Failed to check GMB account:', error);
        setHasGmbAccount(false);
      }
    };

    checkGMBAccount();
  }, []);

  // Extract categories from locations
  useEffect(() => {
    if (locations.length > 0) {
      const uniqueCategories = Array.from(
        new Set(locations.map((loc: LocationType) => loc.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);
    }
  }, [locations]);

  // Handle sync with cache invalidation
  const handleSync = async () => {
    try {
      setSyncing(true);
      
      // Invalidate cache to force fresh data
      locationsCacheUtils.invalidateLocationsList();
      
      // Wait a moment to simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refetch data
      await refetchLocations();
      
      toast.success('Locations synced successfully!');
    } catch (error) {
      toast.error('Failed to sync locations');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate stats from locations data
  const getOverallStats = () => {
    if (!locations.length) return { totalViews: 0, totalClicks: 0, avgRating: 0, avgHealthScore: 0 };
    
    const totalViews = locations.reduce((sum: number, loc: LocationType) => sum + (loc.insights?.views || 0), 0);
    const totalClicks = locations.reduce((sum: number, loc: LocationType) => sum + (loc.insights?.clicks || 0), 0);
    const avgRating = locations.reduce((sum: number, loc: LocationType) => sum + (loc.rating || 0), 0) / locations.length;
    const avgHealthScore = locations.reduce((sum: number, loc: LocationType) => sum + (loc.healthScore || 0), 0) / locations.length;
    
    return { totalViews, totalClicks, avgRating, avgHealthScore };
  };

  const stats = getOverallStats();
  const hasFilters = Boolean(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all');

  // Event handlers with proper server action naming
  const handleEditAction = (id: string) => {
    toast.info(`Edit location ${id}`);
  };

  const handleViewDetailsAction = (id: string) => {
    toast.info(`View details for ${id}`);
  };

  const handleAddLocationAction = () => {
    toast.info('Add new location');
  };

  const handleRetryAction = () => {
    refetchLocations();
  };

  const handleFiltersOpenAction = () => {
    setShowMobileFilters(true);
  };

  const handleFiltersCloseAction = () => {
    setShowMobileFilters(false);
  };

  const handleFiltersChangeAction = (newFilters: any) => {
    if (newFilters.healthScore) {
      // Handle health score filter
    }
    if (newFilters.status) {
      setSelectedStatus(newFilters.status);
    }
    if (newFilters.reviews) {
      // Handle reviews filter
    }
    // Clear all filters
    if (Object.keys(newFilters).length === 0) {
      setSearchTerm('');
      setSelectedStatus('all');
      setSelectedCategory('all');
    }
  };

  const handleViewModeChangeAction = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const handleSearchFocusAction = () => {
    // Focus search input (would be implemented with ref in real app)
    toast.info('Search focused');
  };

  // Show loading skeleton during initial load
  if (loading && hasGmbAccount === null) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 bg-muted animate-pulse rounded w-64" />
            <div className="h-5 bg-muted animate-pulse rounded w-96" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-40 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Stats Skeletons */}
        <LocationsSection section="Stats Loading">
          <ResponsiveStatsGrid stats={[]} />
        </LocationsSection>

        {/* Filters Skeleton */}
        <LocationsSection section="Filters Loading">
          <div className="h-20 bg-muted animate-pulse rounded" />
        </LocationsSection>

        {/* Cards Grid Skeleton */}
        <div className={`grid gap-6 ${
          gridCols === 1 ? 'grid-cols-1' :
          gridCols === 2 ? 'md:grid-cols-2' :
          gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
          'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {Array.from({ length: 6 }, (_, i) => (
            <EnhancedLocationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Show No GMB Account state
  if (!loading && hasGmbAccount === false) {
    return (
      <LocationsSection section="GMB Connection" fallback={() => (
        <div className="text-center p-8">
          <p>Failed to load GMB connection banner</p>
        </div>
      )}>
        <GMBConnectionBanner />
      </LocationsSection>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <LocationsSection section="Error Display">
          <LocationsErrorAlert 
            error={error.message} 
            onRetryAction={handleRetryAction}
          />
        </LocationsSection>
      )}

      {/* Mobile Toolbar */}
      {isMobile && (
        <MobileLocationsToolbar
          viewMode={viewMode}
          onViewModeChangeAction={handleViewModeChangeAction}
          onFiltersOpenAction={handleFiltersOpenAction}
          onSearchFocusAction={handleSearchFocusAction}
          searchQuery={searchTerm}
          resultsCount={totalCount}
        />
      )}

      {/* Mobile Filters Drawer */}
      <MobileFiltersDrawer
        isOpen={showMobileFilters}
        onCloseAction={handleFiltersCloseAction}
        filters={{ healthScore: 'All', status: selectedStatus, reviews: 'All' }}
        onFiltersChangeAction={handleFiltersChangeAction}
      />

      {/* Desktop Header */}
      {!isMobile && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSync} disabled={syncing} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing && 'animate-spin'}`} />
              {syncing ? t('actions.syncing') : t('actions.syncAll')}
            </Button>
            <Button onClick={() => router.push('/locations')} variant="secondary">
              <Layers className="w-4 h-4 mr-2" />
              {t('actions.mapView')}
            </Button>
            <Button onClick={handleAddLocationAction}>
              <Plus className="w-4 h-4 mr-2" />
              {t('actions.addLocation')}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <LocationsSection section="Statistics" fallback={() => (
        <div className="text-center p-8">
          <p>Failed to load statistics</p>
        </div>
      )}>
        {isMobile ? (
          <ResponsiveStatsGrid stats={[
            { value: locations.length, label: t('stats.totalLocations') },
            { value: formatLargeNumber(stats.totalViews), label: t('stats.totalViews') },
            { value: (stats.avgRating || 0).toFixed(1), label: t('stats.avgRating') },
            { value: Math.round(stats.avgHealthScore || 0) + '%', label: t('stats.avgHealthScore') }
          ]} />
        ) : (
          <LocationsStats
            totalLocations={locations.length}
            totalViews={stats.totalViews}
            avgRating={stats.avgRating}
            avgHealthScore={stats.avgHealthScore}
          />
        )}
      </LocationsSection>

      {/* Filters */}
      {!isMobile && (
        <LocationsSection section="Filters">
          <LocationsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
          />
        </LocationsSection>
      )}

      {/* Locations Grid */}
      <LocationsSection section="Locations Grid" fallback={() => (
        <div className="text-center p-8">
          <p>Failed to load locations</p>
        </div>
      )}>
        {loading ? (
          <div className={`grid gap-6 ${
            gridCols === 1 ? 'grid-cols-1' :
            gridCols === 2 ? 'md:grid-cols-2' :
            gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
            'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {Array.from({ length: 6 }, (_, i) => (
              <EnhancedLocationCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'list' ? 'grid-cols-1' :
            gridCols === 1 ? 'grid-cols-1' :
            gridCols === 2 ? 'md:grid-cols-2' :
            gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
            'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {locations.map((location: LocationType) => (
              <EnhancedLocationCard
                key={location.id}
                location={location}
              />
            ))}
          </div>
        )}
      </LocationsSection>

      {/* Empty State */}
      {!loading && locations.length === 0 && (
        <LocationsSection section="Empty State">
          <EmptyLocationsState
            hasFilters={hasFilters}
            onAddLocationAction={handleAddLocationAction}
          />
        </LocationsSection>
      )}
    </div>
  );
}