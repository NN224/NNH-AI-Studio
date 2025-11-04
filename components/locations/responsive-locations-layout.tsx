'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Star, 
  TrendingUp, 
  Users, 
  BarChart3,
  Filter,
  Search,
  Grid3X3,
  List,
  Menu,
  X,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

// Mobile breakpoint hook
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return isMobile;
}

// Responsive grid hook
export function useResponsiveGrid() {
  const [gridCols, setGridCols] = useState(3);
  
  useEffect(() => {
    const updateGrid = () => {
      const width = window.innerWidth;
      if (width < 640) setGridCols(1);      // Mobile
      else if (width < 1024) setGridCols(2); // Tablet
      else if (width < 1536) setGridCols(3); // Desktop
      else setGridCols(4);                    // Large desktop
    };
    
    updateGrid();
    window.addEventListener('resize', updateGrid);
    return () => window.removeEventListener('resize', updateGrid);
  }, []);
  
  return gridCols;
}

// Mobile-optimized location card
export function MobileLocationCard({ 
  location, 
  onSelectAction, 
  isSelected = false 
}: {
  location: any;
  onSelectAction?: (location: any) => void;
  isSelected?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className={`
      transition-all duration-200 
      ${isSelected ? 'ring-2 ring-primary' : ''}
      ${isExpanded ? 'shadow-lg' : 'shadow-sm'}
    `}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {location.displayName}
            </CardTitle>
            <CardDescription className="text-sm mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{location.address}</span>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 h-6 w-6"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        
        {/* Health Score & Rating - Always visible */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Badge variant={location.healthScore >= 80 ? 'default' : 'secondary'} className="text-xs">
              Health: {location.healthScore}%
            </Badge>
            {location.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{location.rating}</span>
                <span className="text-xs text-muted-foreground">({location.reviewCount})</span>
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectAction?.(location)}
            className="text-xs px-2 py-1 h-6"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View
          </Button>
        </div>
      </CardHeader>
      
      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-3" />
          
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold text-primary">{location.weeklyViews || 0}</div>
              <div className="text-xs text-muted-foreground">Views</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">{location.weeklySearches || 0}</div>
              <div className="text-xs text-muted-foreground">Searches</div>
            </div>
          </div>
          
          {/* Contact info */}
          <div className="space-y-2 text-sm">
            {location.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span className="truncate">{location.phoneNumber}</span>
              </div>
            )}
            {location.websiteUri && (
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="truncate text-blue-600">Website</span>
              </div>
            )}
            {location.regularHours && (
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs">
                  {location.isOpen ? 'Open now' : 'Closed'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Mobile filter drawer
export function MobileFiltersDrawer({ 
  isOpen, 
  onCloseAction, 
  filters, 
  onFiltersChangeAction 
}: {
  isOpen: boolean;
  onCloseAction: () => void;
  filters: any;
  onFiltersChangeAction: (filters: any) => void;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 md:hidden">
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-background border-l shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button variant="ghost" size="sm" onClick={onCloseAction}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {/* Health Score Filter */}
          <div>
            <h3 className="font-medium mb-3">Health Score</h3>
            <div className="space-y-2">
              {['All', '80-100%', '60-79%', '40-59%', '0-39%'].map((range) => (
                <label key={range} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="healthScore" 
                    value={range}
                    checked={filters.healthScore === range}
                    onChange={(e) => onFiltersChangeAction({...filters, healthScore: e.target.value})}
                    className="rounded"
                  />
                  <span className="text-sm">{range}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Status Filter */}
          <div>
            <h3 className="font-medium mb-3">Status</h3>
            <div className="space-y-2">
              {['All', 'Published', 'Suspended', 'Pending'].map((status) => (
                <label key={status} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="status" 
                    value={status}
                    checked={filters.status === status}
                    onChange={(e) => onFiltersChangeAction({...filters, status: e.target.value})}
                    className="rounded"
                  />
                  <span className="text-sm">{status}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Review Count Filter */}
          <div>
            <h3 className="font-medium mb-3">Reviews</h3>
            <div className="space-y-2">
              {['All', '50+', '20-49', '5-19', '0-4'].map((range) => (
                <label key={range} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="reviews" 
                    value={range}
                    checked={filters.reviews === range}
                    onChange={(e) => onFiltersChangeAction({...filters, reviews: e.target.value})}
                    className="rounded"
                  />
                  <span className="text-sm">{range} reviews</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onFiltersChangeAction({})}
              className="flex-1"
            >
              Clear All
            </Button>
            <Button onClick={onCloseAction} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile toolbar
export function MobileLocationsToolbar({ 
  viewMode, 
  onViewModeChangeAction, 
  onFiltersOpenAction, 
  onSearchFocusAction,
  searchQuery,
  resultsCount 
}: {
  viewMode: 'grid' | 'list';
  onViewModeChangeAction: (mode: 'grid' | 'list') => void;
  onFiltersOpenAction: () => void;
  onSearchFocusAction: () => void;
  searchQuery: string;
  resultsCount: number;
}) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b md:hidden">
      <div className="p-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Button
            variant="outline"
            onClick={onSearchFocusAction}
            className="w-full justify-start pl-10 text-muted-foreground"
          >
            {searchQuery || 'Search locations...'}
          </Button>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {resultsCount} locations
          </div>
          
          <div className="flex items-center gap-1">
            {/* View mode toggle */}
            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChangeAction('grid')}
                className="p-1 h-7 w-7"
              >
                <Grid3X3 className="w-3 h-3" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChangeAction('list')}
                className="p-1 h-7 w-7"
              >
                <List className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Filters button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onFiltersOpenAction}
              className="gap-1 px-3"
            >
              <Filter className="w-3 h-3" />
              Filter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Responsive stats grid
export function ResponsiveStatsGrid({ stats }: { stats: any[] }) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    // Mobile: horizontal scrollable cards
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {stats.map((stat, index) => (
          <Card key={index} className="min-w-[120px] flex-shrink-0">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              {stat.change && (
                <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                  stat.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {stat.change > 0 ? '+' : ''}{stat.change}%
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Desktop: regular grid
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            {stat.change && (
              <div className={`text-sm mt-2 flex items-center justify-center gap-1 ${
                stat.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className="w-4 h-4" />
                {stat.change > 0 ? '+' : ''}{stat.change}%
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}