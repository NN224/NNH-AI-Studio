'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Star, MapPin, Heart, Eye, Phone, MessageSquare, 
  BarChart3, Edit3, CheckCircle2, TrendingUp
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { Location, formatLargeNumber, getHealthScoreColor } from './location-types';

interface EnhancedLocationCardProps {
  location: Location;
  onEdit?: (id: string) => void;
}

// Added React.memo for performance optimization to prevent unnecessary re-renders
export const EnhancedLocationCard: React.FC<EnhancedLocationCardProps> = React.memo(({ 
  location,
  onEdit 
}) => {
  const t = useTranslations('Locations');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);

  // Fetch cover and logo images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);
        
        // Fetch cover image (silently fail if not found)
        try {
          const coverRes = await fetch(`/api/locations/${location.id}/cover`);
          if (coverRes.ok) {
            const coverData = await coverRes.json();
            if (coverData.url) {
              setCoverUrl(coverData.url);
            }
          }
        } catch (err) {
          // Silently fail for cover - will show gradient fallback
          console.debug('No cover image available');
        }

        // Fetch logo image (silently fail if not found)
        try {
          const logoRes = await fetch(`/api/locations/${location.id}/logo`);
          if (logoRes.ok) {
            const logoData = await logoRes.json();
            if (logoData.url) {
              setLogoUrl(logoData.url);
            }
          }
        } catch (err) {
          // Silently fail for logo - will show icon fallback
          console.debug('No logo available');
        }
      } catch (error) {
        console.error('Failed to fetch images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    if (location.id) {
      fetchImages();
    }
  }, [location.id]);

  // Safe insights access - Added null check for location object before accessing properties
  const insights = location?.insights || {
    views: 0,
    clicks: 0,
    calls: 0,
    directions: 0,
  };

  const healthScore = location.healthScore || 0;
  const rating = location.rating || 0;
  const reviewCount = location.reviewCount || 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 glass-strong relative">
      {/* Cover Image Section */}
      <div className="relative h-32 overflow-hidden rounded-t-lg">
        {loadingImages ? (
          <Skeleton className="w-full h-full" />
        ) : coverUrl ? (
          <img 
            src={coverUrl} 
            alt={location?.name ? `Cover image for ${location.name}` : 'Location cover image'} 
            className="w-full h-full object-cover"
            role="img"
            aria-describedby={`location-${location?.id}-description`}
          />
        ) : (
          // Gradient fallback if no cover image
          <div className="absolute inset-0 gradient-orange opacity-80" />
        )}
        
        {/* Logo positioned over cover image */}
        <div className="absolute left-6 -bottom-12 z-10">
          <div className="w-24 h-24 rounded-lg border-4 border-background bg-muted flex items-center justify-center overflow-hidden">
            {loadingImages ? (
              <Skeleton className="w-full h-full rounded-lg" />
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt={location.name || 'Logo'} 
                className="w-full h-full object-cover"
              />
            ) : (
              // Fallback icon if no logo
              <MapPin className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-6 pt-16">
        {/* Header Info */}
        <div className="space-y-3">
          {/* Name and Rating */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {location.name}
              </h3>
              {location.status === 'verified' && (
                <Badge variant="default" className="bg-success/20 text-success border-success/30 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ({formatLargeNumber(reviewCount)} {t('labels.reviews')})
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{location.address || 'N/A'}</span>
            </div>
          </div>

          {/* Health Score and Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
            {/* Health Score */}
            <div className="flex items-center gap-2">
              <Heart className={`w-5 h-5 ${getHealthScoreColor(healthScore)}`} />
              <div>
                <p className="text-xs text-muted-foreground">{t('labels.healthScore')}</p>
                <p className={`font-bold ${getHealthScoreColor(healthScore)}`}>
                  {healthScore}%
                </p>
              </div>
            </div>

            {/* Views */}
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-info" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted-foreground">{t('labels.views')}</p>
                <p className="font-bold text-foreground">{formatLargeNumber(insights.views)}</p>
              </div>
            </div>

            {/* Calls */}
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-success" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted-foreground">{t('labels.calls')}</p>
                <p className="font-bold text-foreground">{formatLargeNumber(insights.calls)}</p>
              </div>
            </div>

            {/* Reviews */}
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted-foreground">{t('labels.reviews')}</p>
                <p className="font-bold text-foreground">{formatLargeNumber(reviewCount)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              asChild
              variant="outline"
              className="flex-1 border-primary/30 hover:bg-primary/10 hover:border-primary/50 min-h-[44px] md:min-h-0"
            >
              <Link href={`/locations/${location.id}/insights`}>
                <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" />
                {t('card.viewInsights')}
              </Link>
            </Button>

            <Button
              variant="default"
              className="flex-1 min-h-[44px] md:min-h-0"
              onClick={() => onEdit?.(location.id)}
              aria-label={`Edit location ${location?.name || location?.id}`}
            >
              <Edit3 className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('card.editLocation')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Add display name for better debugging
EnhancedLocationCard.displayName = 'EnhancedLocationCard';

// Skeleton for loading state
export const EnhancedLocationCardSkeleton = () => {
  return (
    <Card className="overflow-hidden glass-strong relative">
      <Skeleton className="h-32 w-full" />
      <CardContent className="p-6 pt-16">
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 flex-1 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
