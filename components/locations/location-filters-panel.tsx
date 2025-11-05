"use client";

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, ChevronDown, ChevronUp, Star, Activity, TrendingUp } from 'lucide-react';
import { LocationFilters } from '@/hooks/use-locations';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/lib/utils/debounce';

interface LocationFiltersPanelProps {
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
}

export function LocationFiltersPanel({ filters, onFiltersChange }: LocationFiltersPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // ✅ PERFORMANCE: Debounce search input (300ms delay)
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update filters when debounced search changes
  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({
        ...filters,
        search: debouncedSearch || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ✅ PERFORMANCE: Memoize active filters check
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(
      key => {
        const value = filters[key as keyof LocationFilters];
        return value !== undefined && 
               value !== 'all' && 
               value !== null && 
               value !== '';
      }
    );
  }, [filters]);

  const updateFilter = React.useCallback((key: keyof LocationFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' || value === null ? undefined : value,
    });
  }, [filters, onFiltersChange]);

  const clearFilters = () => {
    onFiltersChange({});
    setShowAdvanced(false);
  };

  const applyQuickFilter = (quickFilter: 'needs_attention' | 'top_performers' | null) => {
    if (quickFilter === 'needs_attention') {
      onFiltersChange({
        ...filters,
        quickFilter: 'needs_attention',
        healthScoreMax: 60,
      });
    } else if (quickFilter === 'top_performers') {
      onFiltersChange({
        ...filters,
        quickFilter: 'top_performers',
        ratingMin: 4.5,
        healthScoreMin: 80,
      });
    } else {
      // Clear quick filter
      const { quickFilter: _, healthScoreMax: __, ratingMin: ___, healthScoreMin: ____, ...rest } = filters;
      onFiltersChange(rest);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        {/* Basic Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => updateFilter('category', value)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Restaurant">Restaurant</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value as any)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="needs_attention">Needs Attention</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            value={filters.sortBy || 'name'}
            onValueChange={(value) => updateFilter('sortBy', value as any)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="reviews">Reviews</SelectItem>
              <SelectItem value="healthScore">Health Score</SelectItem>
              <SelectItem value="lastSync">Last Sync</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full md:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.quickFilter === 'needs_attention' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyQuickFilter(filters.quickFilter === 'needs_attention' ? null : 'needs_attention')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Needs Attention
          </Button>
          <Button
            variant={filters.quickFilter === 'top_performers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyQuickFilter(filters.quickFilter === 'top_performers' ? null : 'top_performers')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Top Performers
          </Button>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="ml-auto"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Advanced
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Advanced Filters
              </>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Rating Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Rating Range
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="Min"
                    value={filters.ratingMin || ''}
                    onChange={(e) => updateFilter('ratingMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="Max"
                    value={filters.ratingMax || ''}
                    onChange={(e) => updateFilter('ratingMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Health Score Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Health Score
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Min"
                    value={filters.healthScoreMin || ''}
                    onChange={(e) => updateFilter('healthScoreMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Max"
                    value={filters.healthScoreMax || ''}
                    onChange={(e) => updateFilter('healthScoreMax', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Review Count Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Review Count</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={filters.reviewCountMin || ''}
                    onChange={(e) => updateFilter('reviewCountMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={filters.reviewCountMax || ''}
                    onChange={(e) => updateFilter('reviewCountMax', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <Select
                  value={filters.dateRange || 'none'}
                  onValueChange={(value) => updateFilter('dateRange', value === 'none' ? undefined : value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Date filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No date filter</SelectItem>
                    <SelectItem value="last_sync">Last Sync</SelectItem>
                    <SelectItem value="created">Created Date</SelectItem>
                  </SelectContent>
                </Select>
                {filters.dateRange && (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters.dateFrom || ''}
                      onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                      className="w-full"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters.dateTo || ''}
                      onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
