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
  
  if (!location) {
    return (
      <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
        No location data provided
      </div>
    );
  }

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

  const coverImageUrl =
    location.coverImageUrl ??
    (location.metadata?.profile?.coverPhotoUrl as string | undefined) ??
    null;
  const logoImageUrl =
    location.logoImageUrl ??
    (location.metadata?.profile?.logoUrl as string | undefined) ??
    null;

  const hasCover = Boolean(coverImageUrl);
  const hasLogo = Boolean(logoImageUrl);

  const ratingValue = rating != null ? rating.toFixed(1) : location.rating != null ? location.rating.toFixed(1) : '—';
  const ratingTrend = location.ratingTrend ?? 0;
  const viewsThisMonth = Number(location.insights?.views ?? 0);
  const responseRate = Number(location.responseRate ?? location.insights?.responseRate ?? 0);
  const pendingReviews = Number(location.insights?.pendingReviews ?? 0);
  const healthComposite = Number(location.healthScore ?? 0);

  const statChips = [
    {
      label: 'Rating Trend (30d)',
      value: ratingValue,
      delta: `${ratingTrend >= 0 ? '+' : ''}${ratingTrend.toFixed(1)} vs last month`,
    },
    {
      label: 'Views This Month',
      value: viewsThisMonth.toLocaleString(),
      delta: `${Math.round(responseRate)}% response rate`,
    },
    {
      label: 'Pending Reviews',
      value: pendingReviews.toString(),
      delta: 'Reviews need response',
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/45 backdrop-blur-lg shadow-lg">
      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative min-h-[200px] overflow-hidden">
          {hasCover ? (
            <>
              <img
                src={coverImageUrl!}
                alt={`${location.name} cover`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/60 to-accent/60">
              <span className="rounded-full border border-white/30 bg-black/60 px-3 py-1 text-[11px] text-white">
                No cover photo
              </span>
            </div>
          )}

          <div className="absolute bottom-6 left-6 flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/60 bg-black/70 shadow">
              {hasLogo ? (
                <img
                  src={logoImageUrl!}
                  alt={`${location.name} logo`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                  No logo
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-white">{location.name || 'Unnamed Location'}</h3>
            {location.status === 'verified' && (
              <Badge className="border border-emerald-500/40 bg-emerald-500/15 text-xs text-emerald-300">
                ✓ Verified
              </Badge>
            )}
            {location.category && (
              <Badge variant="outline" className="text-xs">
                {location.category}
              </Badge>
            )}

            {!hasCover && (
              <Badge
                variant="outline"
                className="cursor-pointer border-dashed border-white/30 text-[11px] text-white/80 hover:border-white/60 hover:text-white"
                onClick={() => router.push('/settings/branding')}
              >
                Add cover photo
              </Badge>
            )}
            {!hasLogo && (
              <Badge
                variant="outline"
                className="cursor-pointer border-dashed border-white/30 text-[11px] text-white/80 hover:border-white/60 hover:text-white"
                onClick={() => router.push('/settings/branding')}
              >
                Add logo
              </Badge>
            )}
          </div>

          {location.address && (
            <p className="flex items-start gap-2 text-sm text-gray-300">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="line-clamp-2">{location.address}</span>
            </p>
          )}

          <div className="grid gap-3 text-sm md:grid-cols-3">
            {statChips.map((chip) => (
              <div key={chip.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
                <div className="text-xs uppercase tracking-wide text-white/50">{chip.label}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{chip.value}</div>
                <div className="mt-1 text-xs text-emerald-300">{chip.delta}</div>
              </div>
            ))}
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
              className="ml-auto text-xs text-white/70 hover:text-white"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" /> Hide insights
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" /> Show insights
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 bg-black/35 px-6 pb-6 pt-4 md:px-8">
          <LocationMiniDashboard
            location={location}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            metrics={undefined}
          />
        </div>
      )}
    </div>
  );
}

