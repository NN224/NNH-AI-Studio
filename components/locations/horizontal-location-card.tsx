"use client";

import React, { useState } from 'react';
import { useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Location } from '@/components/locations/location-types';
import { getHealthScoreColor, formatLargeNumber } from '@/components/locations/location-types';
import { Phone, MapPin, Eye, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { LocationMiniDashboard } from './location-mini-dashboard';

interface HorizontalLocationCardProps {
  location: Location;
  onViewDetails?: (id: string) => void;
}

export function HorizontalLocationCard({ location, onViewDetails }: HorizontalLocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Safety check
  if (!location) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-400">
        No location data provided
      </div>
    );
  }

  // Debug: Log the entire location object
  console.log('[HorizontalLocationCard] Full location object:', location);
  console.log('[HorizontalLocationCard] Rating fields:', {
    rating: location.rating,
    avgRating: (location as any).avgRating,
    average_rating: (location as any).average_rating,
    averageRating: (location as any).averageRating,
  });
  console.log('[HorizontalLocationCard] Health score fields:', {
    healthScore: location.healthScore,
    health_score: (location as any).health_score,
    avgHealthScore: (location as any).avgHealthScore,
    average_health_score: (location as any).average_health_score,
    averageHealthScore: (location as any).averageHealthScore,
  });
  console.log('[HorizontalLocationCard] Review count fields:', {
    reviewCount: location.reviewCount,
    reviews_count: (location as any).reviews_count,
    reviewsCount: (location as any).reviewsCount,
    total_reviews: (location as any).total_reviews,
    totalReviews: (location as any).totalReviews,
  });
  console.log('[HorizontalLocationCard] All location keys:', Object.keys(location));

  const router = useRouter();

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(location.id);
    } else {
      router.push(`/locations/${location.id}`);
    }
  };

  const handleCall = () => {
    if (location.phone) {
      window.location.href = `tel:${location.phone}`;
    }
  };

  const handleDirections = () => {
    if (location.coordinates) {
      const { lat, lng } = location.coordinates;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (location.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`, '_blank');
    }
  };

  // Try all possible field names for rating, healthScore, and reviewCount
  // This matches how stats cards access the data (using || 0 fallback)
  // Also handle string values that need parsing
  const getNumericValue = (value: any): number | undefined => {
    if (value == null) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };

  const rating = 
    getNumericValue(location.rating) ?? 
    getNumericValue((location as any).avgRating) ?? 
    getNumericValue((location as any).average_rating) ?? 
    getNumericValue((location as any).averageRating) ?? 
    undefined;
  
  const healthScore = 
    getNumericValue(location.healthScore) ?? 
    getNumericValue((location as any).health_score) ?? 
    getNumericValue((location as any).avgHealthScore) ?? 
    getNumericValue((location as any).average_health_score) ?? 
    getNumericValue((location as any).averageHealthScore) ?? 
    undefined;
  
  const reviewCount = 
    getNumericValue(location.reviewCount) ?? 
    getNumericValue((location as any).reviews_count) ?? 
    getNumericValue((location as any).reviewsCount) ?? 
    getNumericValue((location as any).total_reviews) ?? 
    getNumericValue((location as any).totalReviews) ?? 
    undefined;

  // Debug: Log the extracted values
  console.log('[HorizontalLocationCard] Extracted values:', {
    rating,
    healthScore,
    reviewCount,
    ratingType: typeof rating,
    healthScoreType: typeof healthScore,
    reviewCountType: typeof reviewCount,
  });
  
  const coverImageUrl =
    location.coverImageUrl ??
    (location.metadata?.profile?.coverPhotoUrl as string | undefined) ??
    null;
  const logoImageUrl =
    location.logoImageUrl ??
    (location.metadata?.profile?.logoUrl as string | undefined) ??
    null;

  const hasImage = Boolean(coverImageUrl);
  const hasLogo = Boolean(logoImageUrl);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-lg shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-1">
      <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="relative min-h-[200px] overflow-hidden">
          <div
            className={`absolute inset-0 ${
              hasImage ? 'bg-black/20' : 'bg-gradient-to-br from-primary/70 to-accent/70'
            }`}
          >
            {hasImage && (
              <img
                src={coverImageUrl!}
                alt={`${location.name} cover`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {!hasImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black shadow-lg hover:bg-white"
                onClick={() => router.push('/settings/branding')}
              >
                Add cover photo
              </Button>
            </div>
          )}

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/60 bg-black/60 shadow-lg">
              {hasLogo ? (
                <img
                  src={logoImageUrl!}
                  alt={`${location.name} logo`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/settings/branding')}
                  className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent px-3 text-center text-sm font-semibold text-white hover:opacity-90"
                >
                  Add logo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">{location.name || 'Unnamed Location'}</h3>
            {location.status === 'verified' && (
              <Badge className="inline-flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400">
                ✓ Verified
              </Badge>
            )}
            {location.category && (
              <Badge variant="outline" className="text-xs">
                {location.category}
              </Badge>
            )}
          </div>

          {location.address && (
            <p className="flex items-start gap-2 text-sm text-gray-300">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="line-clamp-2">{location.address}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {rating != null && rating > 0 ? (
              <span className="flex items-center gap-1 text-white">
                <span className="text-yellow-500">⭐</span>
                {typeof rating === 'number' ? rating.toFixed(1) : rating}
                {reviewCount != null && reviewCount > 0 && (
                  <span className="ml-1 text-gray-400">
                    ({formatLargeNumber(reviewCount)} reviews)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-400">No rating yet</span>
            )}
            {rating != null && rating > 0 && healthScore != null && healthScore > 0 && (
              <span className="text-gray-500">•</span>
            )}
            {healthScore != null && healthScore > 0 ? (
              <span className={`font-medium ${getHealthScoreColor(healthScore)}`}>
                Health: {healthScore}%
              </span>
            ) : (
              <span className="text-gray-400">No health score</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {location.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCall}
                className="border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
              >
                <Phone className="mr-2 h-4 w-4" />
                Call
              </Button>
            )}
            {(location.coordinates || location.address) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDirections}
                className="border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Directions
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              className="border-white/20 bg-primary/20 text-white hover:border-white/40 hover:bg-primary/30"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/locations/${location.id}/edit`)}
              className="border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto text-sm text-white/80 hover:text-white"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide insights
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show insights
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 bg-black/40 px-6 pb-6 pt-4 md:px-8">
          <LocationMiniDashboard
            location={location}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />
        </div>
      )}
    </div>
  );
}

function getHealthColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

