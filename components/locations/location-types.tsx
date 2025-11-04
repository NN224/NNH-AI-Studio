import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, Star, TrendingUp, TrendingDown, Shield, Eye, BarChart3,
  Edit3, MessageSquare, Info, Phone, Globe, Tag, Utensils, Calendar,
  Video, Image, FileText, MessageCircle, Megaphone, AlertCircle,
  Clock, Camera, CheckCircle2, Plus, Sparkles, HelpCircle, Bot, Lock
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/lib/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Types for location data
export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  status: 'verified' | 'pending' | 'suspended';
  category: string;
  coordinates: { lat: number; lng: number };
  hours: BusinessHours;
  attributes: string[];
  photos: number;
  posts: number;
  healthScore: number;
  visibility: number;
  lastSync: Date;
  insights: LocationInsights;
  // Extended fields for comprehensive health score
  additionalCategories?: string[];
  menuLink?: string;
  menuItems?: number;
  openingDate?: string;
  videos?: number;
  hasLogo?: boolean;
  menuPhotos?: number;
  qnaEnabled?: boolean;
  autoReplyEnabled?: boolean;
  profileProtection?: boolean;
}

export interface BusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface LocationInsights {
  views: number;
  viewsTrend: number;
  clicks: number;
  clicksTrend: number;
  calls: number;
  callsTrend: number;
  directions: number;
  directionsTrend: number;
  weeklyGrowth: number;
}

// Helper functions
export const formatLargeNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-green-500/20 text-green-700 border-green-500/50';
    case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
    case 'suspended': return 'bg-red-500/20 text-red-700 border-red-500/50';
    default: return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
  }
};

export const getHealthScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

export const getTrendColor = (trend: number) => {
  if (trend > 0) return 'text-green-500';
  if (trend < 0) return 'text-red-500';
  return 'text-muted-foreground';
};

// Calculate Health Score Breakdown (17 sections)
export const getHealthScoreBreakdown = (location: Location) => {
  // Check each section
  const hasPhone = location.phone && location.phone.length > 0;
  const hasWebsite = location.website && location.website.length > 0;
  const hasCategories = location.additionalCategories && location.additionalCategories.length > 0;
  const hasMenuLink = location.menuLink && location.menuLink.length > 0;
  const hasMenuItems = (location.menuItems || 0) > 0;
  const hasOpeningDate = location.openingDate && location.openingDate.length > 0;
  const hasHours = location.hours && Object.keys(location.hours).length > 0;
  const hasAttributes = location.attributes && location.attributes.length > 0;
  const hasPhotos = location.photos >= 5;
  const hasVideos = (location.videos || 0) > 0;
  const hasLogo = location.hasLogo || false;
  const hasMenuPhotos = (location.menuPhotos || 0) > 0;
  const hasDescription = hasWebsite; // Using website as proxy for description
  const hasEnoughReviews = location.reviewCount >= 10;
  const hasRecentPosts = location.posts > 0;
  const hasGoodResponseRate = location.reviewCount > 0;
  const hasQnA = location.qnaEnabled || false;
  const hasAutoReply = location.autoReplyEnabled || false;
  const hasProtection = location.profileProtection || false;

  const items = [
    { 
      key: 'phoneNumber',
      icon: Phone,
      complete: hasPhone,
      category: 'basic'
    },
    {
      key: 'websiteLink',
      icon: Globe,
      complete: hasWebsite,
      category: 'basic'
    },
    {
      key: 'categories',
      icon: Tag,
      complete: hasCategories,
      count: location.additionalCategories?.length || 0,
      category: 'basic'
    },
    {
      key: 'menuLink',
      icon: Utensils,
      complete: hasMenuLink,
      category: 'menu'
    },
    {
      key: 'menuItems',
      icon: Utensils,
      complete: hasMenuItems,
      count: location.menuItems || 0,
      category: 'menu'
    },
    {
      key: 'openingDate',
      icon: Calendar,
      complete: hasOpeningDate,
      category: 'basic'
    },
    { 
      key: 'hours',
      icon: Clock,
      complete: hasHours,
      category: 'basic'
    },
    {
      key: 'attributes',
      icon: Tag,
      complete: hasAttributes,
      count: location.attributes?.length || 0,
      category: 'basic'
    },
    {
      key: 'photos',
      icon: Camera,
      complete: hasPhotos,
      count: location.photos || 0,
      category: 'media'
    },
    {
      key: 'videos',
      icon: Video,
      complete: hasVideos,
      count: location.videos || 0,
      category: 'media'
    },
    {
      key: 'businessLogo',
      icon: Image,
      complete: hasLogo,
      category: 'media'
    },
    {
      key: 'menuPhotos',
      icon: Camera,
      complete: hasMenuPhotos,
      count: location.menuPhotos || 0,
      category: 'menu'
    },
    {
      key: 'description',
      icon: FileText,
      complete: hasDescription,
      category: 'basic'
    },
    {
      key: 'reviews',
      icon: Star,
      complete: hasEnoughReviews,
      count: location.reviewCount || 0,
      category: 'engagement'
    },
    {
      key: 'posts',
      icon: Megaphone,
      complete: hasRecentPosts,
      count: location.posts || 0,
      category: 'engagement'
    },
    {
      key: 'responses',
      icon: MessageCircle,
      complete: hasGoodResponseRate,
      category: 'engagement'
    },
    {
      key: 'qna',
      icon: HelpCircle,
      complete: hasQnA,
      category: 'engagement'
    },
    {
      key: 'autoReply',
      icon: Bot,
      complete: hasAutoReply,
      category: 'automation'
    },
    {
      key: 'profileProtection',
      icon: Lock,
      complete: hasProtection,
      category: 'security'
    },
  ];

  const completedCount = items.filter(item => item.complete).length;
  const totalCount = items.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return {
    items,
    completedCount,
    totalCount,
    completionPercentage,
  };
};

// Health Score Details Component
export const HealthScoreDetails = ({ location }: { location: Location }) => {
  const t = useTranslations('Locations.healthScore');
  const breakdown = getHealthScoreBreakdown(location);
  const router = useRouter();

  const getActionButton = (itemKey: string) => {
    const actions: Record<string, { label: string; onClick: () => void } | null> = {
      phoneNumber: {
        label: t('actions.addPhone'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=phone`),
      },
      websiteLink: {
        label: t('actions.addWebsite'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=website`),
      },
      categories: {
        label: t('actions.addCategories'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=categories`),
      },
      menuLink: {
        label: t('actions.addMenu'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=menu`),
      },
      menuItems: {
        label: t('actions.addItems'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=menu-items`),
      },
      openingDate: {
        label: t('actions.setDate'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=opening-date`),
      },
      hours: {
        label: t('actions.addHours'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=hours`),
      },
      attributes: {
        label: t('actions.addAttributes'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=attributes`),
      },
      photos: {
        label: t('actions.uploadPhotos'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=photos`),
      },
      videos: {
        label: t('actions.uploadVideos'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=videos`),
      },
      businessLogo: {
        label: t('actions.uploadLogo'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=logo`),
      },
      menuPhotos: {
        label: t('actions.uploadMenuPhotos'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=menu-photos`),
      },
      description: {
        label: t('actions.addDescription'),
        onClick: () => router.push(`/locations/${location.id}/edit?section=description`),
      },
      reviews: {
        label: t('actions.viewReviews'),
        onClick: () => router.push(`/reviews?location=${location.id}`),
      },
      posts: {
        label: t('actions.createPost'),
        onClick: () => router.push(`/gmb-posts?location=${location.id}`),
      },
      responses: {
        label: t('actions.viewReviews'),
        onClick: () => router.push(`/reviews?location=${location.id}`),
      },
      qna: {
        label: t('actions.enableQA'),
        onClick: () => router.push(`/questions?location=${location.id}`),
      },
      autoReply: {
        label: t('actions.setupAutoReply'),
        onClick: () => router.push(`/settings?tab=auto-reply`),
      },
      profileProtection: {
        label: t('actions.enableProtection'),
        onClick: () => router.push(`/settings?tab=protection`),
      },
    };
    return actions[itemKey] || null;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
          <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {location.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div>
              <p className="text-sm text-muted-foreground">{t('outOf', { current: breakdown.completedCount, total: breakdown.totalCount })}</p>
              <p className="text-3xl font-bold text-primary">{breakdown.completionPercentage}%</p>
            </div>
            <Progress value={breakdown.completionPercentage} className="w-32 h-3" />
          </div>

          {/* Breakdown Items in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {breakdown.items.map((item) => {
              const Icon = item.icon;
              const action = getActionButton(item.key);
              const labelKey = `items.${item.key}` as any;
              const tipKey = `tips.${item.key}` as any;

              return (
                <div
                  key={item.key}
                  className={`p-3 rounded-lg border transition-all ${
                    item.complete
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                      : 'bg-muted/30 border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`p-1.5 rounded ${
                          item.complete
                            ? 'bg-green-100 dark:bg-green-900/40'
                            : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            item.complete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {t(labelKey, { count: item.count || 0 })}
                        </h4>
                      </div>
                    </div>
                    {item.complete ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                      </Badge>
                    ) : (
                      <>
                        {action && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={action.onClick}
                            className="flex-shrink-0 h-auto p-1.5 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  {!item.complete && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {t(tipKey)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tips */}
          {breakdown.completionPercentage < 100 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    {t('improve')}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Complete the missing items above to improve your profile visibility and attract more customers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};