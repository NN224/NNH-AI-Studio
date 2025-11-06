"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useLocations } from '@/hooks/use-locations';
import { useRouter } from '@/lib/navigation';
import { HorizontalLocationCard } from '@/components/locations/horizontal-location-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, AlertCircle, Star, Loader2 } from 'lucide-react';
import { LocationCardSkeleton } from '@/components/locations/location-card-skeleton';
import { Location } from '@/components/locations/location-types';

interface LocationsStats {
  totalLocations: number;
  avgRating: number;
  totalReviews: number;
  avgHealthScore: number;
}

export function LocationsListView() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'reviews' | 'healthScore'>('name');
  const [quickFilter, setQuickFilter] = useState<'none' | 'attention' | 'top'>('none');
  const [stats, setStats] = useState<LocationsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Use stable empty filters object to prevent infinite loops
  // Memoize empty object to prevent re-creation on every render
  const emptyFilters = useMemo(() => ({}), []);

  // Use empty filters like Map View to get all locations
  // Then do client-side filtering for better control
  const { locations: rawLocations, loading, error, total } = useLocations(emptyFilters);

  // Ensure locations is always an array
  const locations = Array.isArray(rawLocations) ? rawLocations : [];

  // Fetch aggregated stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await fetch('/api/locations/stats');
        if (!res.ok) {
          console.error('[LocationsListView] Failed to fetch stats:', res.statusText);
          return;
        }
        const data = await res.json();
        console.log('[LocationsListView] Stats fetched:', data);
        setStats(data);
      } catch (err) {
        console.error('[LocationsListView] Error fetching stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Enhance locations with stats when applicable
  const locationsWithStats = useMemo(() => {
    if (!stats || locations.length === 0) {
      return locations;
    }

    // If we have only one location and stats show one location, use aggregated stats
    // This works because the stats are calculated from all locations
    // Also handle case where stats.totalLocations matches locations.length (all locations accounted for)
    if (locations.length === 1 && stats.totalLocations === 1) {
      console.log('[LocationsListView] Enhancing single location with stats:', {
        locationId: locations[0].id,
        originalRating: locations[0].rating,
        originalHealthScore: locations[0].healthScore,
        originalReviewCount: locations[0].reviewCount,
        stats: {
          rating: stats.avgRating,
          reviewCount: stats.totalReviews,
          healthScore: stats.avgHealthScore,
        }
      });
      
      return locations.map(loc => ({
        ...loc,
        // Use stats values if location doesn't have them, otherwise keep location's values
        rating: loc.rating != null ? loc.rating : (stats.avgRating || undefined),
        reviewCount: loc.reviewCount != null ? loc.reviewCount : (stats.totalReviews || undefined),
        healthScore: loc.healthScore != null ? loc.healthScore : (stats.avgHealthScore || undefined),
      }));
    }

    // For multiple locations, we'd need individual stats per location
    // For now, return locations as-is
    return locations;
  }, [locations, stats]);

  // Debug logging at component level
  React.useEffect(() => {
    console.log('=== LIST VIEW DEBUG ===');
    console.log('[LocationsListView] useLocations hook result:', {
      rawLocations,
      locations,
      locationsType: typeof locations,
      isArray: Array.isArray(locations),
      locationsLength: locations?.length,
      total,
      loading,
      error: error?.message,
    });
    if (locations && locations.length > 0) {
      console.log('[LocationsListView] First location:', locations[0]);
    } else if (!loading && locations.length === 0) {
      console.warn('[LocationsListView] ⚠️ No locations found after loading completed');
    }
    console.log('=======================');
  }, [rawLocations, locations, total, loading, error]);

  // Get unique categories from locations
  const categories = useMemo(() => {
    const cats = new Set<string>();
    locations.forEach(loc => {
      if (loc.category) {
        cats.add(loc.category);
      }
    });
    return Array.from(cats).sort();
  }, [locations]);

  // Client-side filtering and sorting
  const filteredLocations = useMemo(() => {
    // Use locationsWithStats instead of locations
    const locationsToFilter = locationsWithStats;
    
    // Safety check: ensure locations is an array
    if (!Array.isArray(locationsToFilter)) {
      console.warn('[LocationsListView] locations is not an array:', locationsToFilter);
      return [];
    }
    
    // If locations is empty, return empty array (this is valid)
    if (locationsToFilter.length === 0) {
      return [];
    }
    
    let filtered = [...locationsToFilter];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        (loc.address && loc.address.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(loc => loc.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'verified') {
        filtered = filtered.filter(loc => loc.status === 'verified');
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(loc => loc.status === 'pending' || loc.status === 'suspended');
      }
    }

    // Quick filters
    if (quickFilter === 'attention') {
      filtered = filtered.filter(loc => (loc.healthScore || 0) < 50);
    } else if (quickFilter === 'top') {
      filtered = filtered.filter(loc => (loc.rating || 0) >= 4.5);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'reviews':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'healthScore':
          return (b.healthScore || 0) - (a.healthScore || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [locationsWithStats, searchQuery, categoryFilter, statusFilter, sortBy, quickFilter]);

  // Debug logging (after filteredLocations is declared)
  React.useEffect(() => {
    console.log('[LocationsListView] Debug info:', {
      locationsCount: locations.length,
      locationsWithStatsCount: locationsWithStats.length,
      total,
      loading,
      statsLoading,
      stats: stats ? {
        totalLocations: stats.totalLocations,
        avgRating: stats.avgRating,
        totalReviews: stats.totalReviews,
        avgHealthScore: stats.avgHealthScore,
      } : null,
      error: error?.message,
      searchQuery,
      categoryFilter,
      statusFilter,
      sortBy,
      quickFilter,
      filteredCount: filteredLocations.length,
    });
    if (locationsWithStats.length > 0) {
      console.log('[LocationsListView] Sample location (with stats):', locationsWithStats[0]);
      console.log('[LocationsListView] Sample location (original):', locations[0]);
    } else if (!loading) {
      console.warn('[LocationsListView] No locations found - check if data is being fetched correctly');
    }
  }, [locations, locationsWithStats, total, loading, statsLoading, stats, error, searchQuery, categoryFilter, statusFilter, sortBy, quickFilter, filteredLocations.length]);

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSortBy('name');
    setQuickFilter('none');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || quickFilter !== 'none';

  if (error) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error loading locations</h3>
            <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Unverified</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="rating">Sort by Rating</SelectItem>
            <SelectItem value="reviews">Sort by Reviews</SelectItem>
            <SelectItem value="healthScore">Sort by Health Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant={quickFilter === 'attention' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setQuickFilter(quickFilter === 'attention' ? 'none' : 'attention')}
          className={quickFilter === 'attention' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Needs Attention
        </Button>
        <Button
          variant={quickFilter === 'top' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setQuickFilter(quickFilter === 'top' ? 'none' : 'top')}
          className={quickFilter === 'top' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
        >
          <Star className="w-4 h-4 mr-2" />
          Top Performers
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredLocations.length} of {locationsWithStats.length} location{locationsWithStats.length !== 1 ? 's' : ''}
          {hasActiveFilters && filteredLocations.length !== locationsWithStats.length && (
            <span className="ml-2 text-xs">(filtered from {locationsWithStats.length} total)</span>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LocationCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Locations List - Horizontal Cards */}
      {!loading && filteredLocations.length > 0 && (
        <div className="flex flex-col gap-4">
          {filteredLocations.map((location) => (
            <HorizontalLocationCard
              key={location.id}
              location={location}
              onViewDetails={(id) => router.push(`/locations/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredLocations.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No locations found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Get started by adding your first location'}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

