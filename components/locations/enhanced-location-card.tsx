'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export const EnhancedLocationCard: React.FC<EnhancedLocationCardProps> = ({ 
  location,
  onEdit 
}) => {
  const t = useTranslations('Locations');

  // Get cover image (first photo or gradient fallback)
  const coverImage = location.photos && location.photos > 0 
    ? `/api/locations/${location.id}/cover` 
    : null;

  // Get logo
  const logoUrl = location.hasLogo 
    ? `/api/locations/${location.id}/logo`
    : null;

  // Safe insights access
  const insights = location.insights || {
    views: 0,
    clicks: 0,
    calls: 0,
    directions: 0,
  };

  const healthScore = location.healthScore || 0;
  const rating = location.rating || 0;
  const reviewCount = location.reviewCount || 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 glass-strong">
      {/* Cover Image Section */}
      <div className="relative h-32 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-500/20 to-orange-400/20 backdrop-blur-sm" />
        )}
        
        {/* Logo positioned over cover */}
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-xl border-4 border-background bg-card overflow-hidden shadow-xl">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${location.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {location.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="pt-16 pb-6">
        {/* Header Info */}
        <div className="space-y-3">
          {/* Name and Rating */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {location.name}
              </h3>
              {location.status === 'verified' && (
                <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
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
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">{t('labels.views')}</p>
                <p className="font-bold text-foreground">{formatLargeNumber(insights.views)}</p>
              </div>
            </div>

            {/* Calls */}
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">{t('labels.calls')}</p>
                <p className="font-bold text-foreground">{formatLargeNumber(insights.calls)}</p>
              </div>
            </div>

            {/* Reviews */}
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
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
              className="flex-1 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
            >
              <Link href={`/locations/${location.id}/insights`}>
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('card.viewInsights')}
              </Link>
            </Button>

            <Button
              variant="default"
              className="flex-1 gradient-orange"
              onClick={() => onEdit?.(location.id)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {t('card.edit')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Skeleton for loading state
export const EnhancedLocationCardSkeleton = () => {
  return (
    <Card className="overflow-hidden glass-strong">
      <div className="relative h-32 bg-muted animate-pulse" />
      <CardContent className="pt-16 pb-6">
        <div className="space-y-4">
          <div className="h-6 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          <div className="grid grid-cols-4 gap-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <div className="h-10 bg-muted rounded flex-1 animate-pulse" />
            <div className="h-10 bg-muted rounded flex-1 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
