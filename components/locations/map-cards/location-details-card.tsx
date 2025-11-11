"use client";

import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Globe, Star, TrendingUp, CheckCircle2 } from 'lucide-react';
import { FloatingCard } from './floating-card';
import { Button } from '@/components/ui/button';
import { Location } from '@/components/locations/location-types';
import { useRouter } from '@/lib/navigation';

interface LocationDetailsCardProps {
  location: Location | null;
  healthScore: number;
  rating?: number;
  ratingTrend?: number;
}

/**
 * LocationDetailsCard Component
 * Shows detailed business information with rating and health score
 */
export function LocationDetailsCard({
  location,
  healthScore,
  rating,
  ratingTrend,
}: LocationDetailsCardProps) {
  const router = useRouter();
  const [healthBarWidth, setHealthBarWidth] = useState('0%');
  const coverImageUrl = location?.coverImageUrl || (location?.metadata?.profile?.coverPhotoUrl as string | undefined);
  const logoImageUrl = location?.logoImageUrl || (location?.metadata?.profile?.logoUrl as string | undefined);
  const hasCover = Boolean(coverImageUrl);
  const hasLogo = Boolean(logoImageUrl);

  // Animate health bar after component mounts
  useEffect(() => {
    if (location) {
      const timer = setTimeout(() => {
        setHealthBarWidth(`${healthScore}%`);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [location, healthScore]);

  if (!location) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render stars
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-yellow-500/50 text-yellow-500" />
        );
      } else {
        stars.push(
          <Star key={i} className="w-4 h-4 text-gray-600" />
        );
      }
    }
    return stars;
  };

  const getHealthBarColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-red-600';
  };

  return (
    <FloatingCard position="top-right" delay={0.2} mobilePosition="top" className="w-full md:w-[400px]">
      <div className="space-y-4">
        <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-white/5 bg-black/30">
          {hasCover ? (
            <>
              <img
                src={coverImageUrl!}
                alt={`${location.name} cover`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
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
        </div>

        {/* Header */}
        <div className="flex items-start gap-3">
          {hasLogo ? (
            <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-black/40">
              <img
                src={logoImageUrl!}
                alt={`${location.name} logo`}
                loading="lazy"
                className="h-full w.full object-cover"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/settings/branding')}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent px-2 text-center text-xs font-semibold text-white hover:opacity-90"
            >
              Add logo
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg truncate">
              {location.name}
            </h3>
            {location.address && (
              <div className="flex items-start gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {location.address}
                </p>
              </div>
            )}
            {location.status === 'verified' && (
              <div className="flex items-center gap-1 mt-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500 font-medium">Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Rating */}
        {(rating !== undefined || location.rating !== undefined) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(rating ?? location.rating ?? 0)}
              </div>
              <span className="text-2xl font-bold text-white">
                {(rating ?? location.rating ?? 0).toFixed(1)}
              </span>
              {ratingTrend !== undefined && ratingTrend > 0 && (
                <div className="flex items-center gap-1 text-green-500 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{ratingTrend} this month</span>
                </div>
              )}
            </div>
            {location.reviewCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                Based on {location.reviewCount} reviews
              </p>
            )}
          </div>
        )}

        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Health Score: {healthScore}%
            </span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getHealthBarColor(healthScore)} transition-all duration-1200 ease-out`}
              style={{ width: healthBarWidth }}
            />
          </div>
          {healthScore < 80 && (
            <p className="text-xs text-muted-foreground">
              💡 Add photos and respond to reviews to improve
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {location.phone && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(`tel:${location.phone}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
          )}
          {location.address && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address!)}`,
                  '_blank'
                );
              }}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Directions
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(`/locations/${location.id}`)}
          >
            <Globe className="w-4 h-4 mr-2" />
            Photos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(`/locations/${location.id}`)}
          >
            Settings
          </Button>
        </div>
      </div>
    </FloatingCard>
  );
}

