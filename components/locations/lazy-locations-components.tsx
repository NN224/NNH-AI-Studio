'use client';

// Removed unused dynamic import from next/dynamic
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { 
  Location, 
  formatLargeNumber, 
  getStatusColor,
  formatSafeDate, 
  getHealthScoreColor, 
  getTrendColor,
  HealthScoreDetails 
} from './location-types';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Star, TrendingUp, TrendingDown, Shield, Eye, BarChart3,
  Edit3, MessageSquare
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

// Helper function to safely access insights
const getSafeInsights = (location: Location) => {
  return {
    views: location.insights?.views || 0,
    clicks: location.insights?.clicks || 0,
    calls: location.insights?.calls || 0,
    viewsTrend: location.insights?.viewsTrend || 0,
    clicksTrend: location.insights?.clicksTrend || 0,
    callsTrend: location.insights?.callsTrend || 0,
  };
};

// Placeholder for when we extract components
// For now, these return the skeleton components

// LocationCard Component
export const LazyLocationCard = ({ 
  location, 
  onEditAction, 
  onViewDetailsAction 
}: {
  location: Location;
  onEditAction: (id: string) => void;
  onViewDetailsAction: (id: string) => void;
}) => {
  const t = useTranslations('Locations');
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                {location.name}
              </h3>
              <Badge className={`text-xs border ${getStatusColor(location.status)}`}>
                {location.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span className="font-medium text-foreground">{(location.rating || 0).toFixed(1)}</span>
                <span>({formatLargeNumber(location.reviewCount || 0)})</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{(location.address || '').split(',')[0] || 'No address'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onEditAction(location.id)}>
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onViewDetailsAction(location.id)}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-primary/20">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{t('labels.healthScore')}</span>
            <HealthScoreDetails location={location} />
          </div>
          <span className={`text-xl font-bold ${getHealthScoreColor(location.healthScore || 0)}`}>
            {location.healthScore}%
          </span>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="text-center p-2 rounded-lg border border-muted">
            <div className="text-base font-bold text-foreground">{formatLargeNumber(getSafeInsights(location).views)}</div>
            <div className="text-xs text-muted-foreground">{t('labels.views')}</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {getSafeInsights(location).viewsTrend > 0 ? (
                <TrendingUp className={`w-3 h-3 ${getTrendColor(getSafeInsights(location).viewsTrend)}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getTrendColor(getSafeInsights(location).viewsTrend)}`} />
              )}
              <span className={getTrendColor(getSafeInsights(location).viewsTrend)}>
                {Math.abs(getSafeInsights(location).viewsTrend)}%
              </span>
            </div>
          </div>

          <div className="text-center p-2 rounded-lg border border-muted">
            <div className="text-base font-bold text-foreground">{formatLargeNumber(getSafeInsights(location).clicks)}</div>
            <div className="text-xs text-muted-foreground">{t('labels.clicks')}</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {getSafeInsights(location).clicksTrend > 0 ? (
                <TrendingUp className={`w-3 h-3 ${getTrendColor(getSafeInsights(location).clicksTrend)}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getTrendColor(getSafeInsights(location).clicksTrend)}`} />
              )}
              <span className={getTrendColor(getSafeInsights(location).clicksTrend)}>
                {Math.abs(getSafeInsights(location).clicksTrend)}%
              </span>
            </div>
          </div>

          <div className="text-center p-2 rounded-lg border border-muted">
            <div className="text-base font-bold text-foreground">{formatLargeNumber(getSafeInsights(location).calls)}</div>
            <div className="text-xs text-muted-foreground">{t('labels.calls')}</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {getSafeInsights(location).callsTrend > 0 ? (
                <TrendingUp className={`w-3 h-3 ${getTrendColor(getSafeInsights(location).callsTrend)}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getTrendColor(getSafeInsights(location).callsTrend)}`} />
              )}
              <span className={getTrendColor(getSafeInsights(location).callsTrend)}>
                {Math.abs(getSafeInsights(location).callsTrend)}%
              </span>
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="flex flex-wrap gap-1">
          {(location.attributes || []).slice(0, 3).map((attr, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {attr}
            </Badge>
          ))}
          {(location.attributes || []).length > 3 && (
            <Badge variant="secondary" className="text-xs">
              {t('labels.attributesMore', { count: (location.attributes || []).length - 3 })}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href={`/reviews?location=${location.id}`}>
              <MessageSquare className="w-4 h-4 mr-1" />
              {t('card.reviews')} ({formatLargeNumber(location.reviewCount || 0)})
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href={`/analytics?location=${location.id}`}>
              <BarChart3 className="w-4 h-4 mr-1" />
              {t('card.insights')}
            </Link>
          </Button>
        </div>

        {/* Last Sync */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {t('labels.lastSync')}: {formatSafeDate(location.lastSync || null)}
        </div>
      </CardContent>
    </Card>
  );
};

// HealthScoreDetails Placeholder 
export const LazyHealthScoreDetails = () => (
  <div className="w-4 h-4 bg-muted animate-pulse rounded" />
);

// LocationsStats Skeleton Component
export const LazyLocationsStats = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// LocationsFilters Skeleton Component
export const LazyLocationsFilters = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex gap-4">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </CardContent>
  </Card>
);

// GMBConnectionBanner Skeleton Component
export const LazyGMBConnectionBanner = () => (
  <Card className="border-2 border-primary/20">
    <CardContent className="p-12">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <Skeleton className="w-16 h-16 rounded-full mx-auto" />
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-5 w-96 mx-auto" />
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-4 justify-center pt-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// LocationCardSkeleton Component
export const LocationCardSkeleton = () => {
  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-2/3" />
              <Badge className="bg-muted animate-pulse">
                <Skeleton className="h-4 w-16" />
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score Skeleton */}
        <div className="p-2 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-10" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-2 rounded-lg border border-muted">
              <Skeleton className="h-5 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-10 mx-auto" />
            </div>
          ))}
        </div>

        {/* Attributes Skeleton */}
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3].map((i) => (
            <Badge key={i} variant="secondary" className="bg-muted animate-pulse">
              <Skeleton className="h-3 w-16" />
            </Badge>
          ))}
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>

        {/* Last Sync Skeleton */}
        <div className="text-center pt-2 border-t">
          <Skeleton className="h-3 w-32 mx-auto" />
        </div>
      </CardContent>
    </Card>
  );
};

// Feature Preview Cards Skeleton
export const FeaturePreviewSkeleton = () => (
  <div className="grid md:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="w-12 h-12 rounded-lg mb-3" />
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    ))}
  </div>
);