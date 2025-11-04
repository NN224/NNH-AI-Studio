"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/lib/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, Star, TrendingUp, TrendingDown,
  Search, Plus, Edit3, Shield, Eye, BarChart3,
  Loader2, RefreshCw, Layers, MessageSquare, 
  CheckCircle2, TrendingUpIcon, Users, Sparkles,
  Clock, Camera, FileText, MessageCircle, Megaphone,
  AlertCircle, ArrowRight, Info, Phone, Globe,
  Tag, Utensils, Calendar, Video, Image, HelpCircle,
  Bot, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

// Types
interface Location {
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

interface BusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface LocationInsights {
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

// Helper
const formatLargeNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// Calculate Health Score Breakdown (17 sections like the image)
const getHealthScoreBreakdown = (location: Location) => {
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
const HealthScoreDetails = ({ location }: { location: Location }) => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{breakdown.items.map((item) => {
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

// Skeleton Card Component
const LocationCardSkeleton = () => {
  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
            <div className="flex items-center gap-4">
              <div className="h-4 bg-muted animate-pulse rounded w-20" />
              <div className="h-4 bg-muted animate-pulse rounded w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-muted animate-pulse rounded" />
            <div className="w-8 h-8 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
          <div className="h-16 bg-muted animate-pulse rounded" />
          <div className="h-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
          <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 bg-muted animate-pulse rounded w-1/2 mx-auto" />
      </CardContent>
    </Card>
  );
};

// Location Card Component
const LocationCard = ({ location, onEdit, onViewDetails }: {
  location: Location;
  onEdit: (id: string) => void;
  onViewDetails: (id: string) => void;
}) => {
  const t = useTranslations('Locations');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
      case 'suspended': return 'bg-red-500/20 text-red-700 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-500';
    if (trend < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

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
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-foreground">{location.rating.toFixed(1)}</span>
                <span>({formatLargeNumber(location.reviewCount)})</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{location.address.split(',')[0]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onEdit(location.id)}>
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onViewDetails(location.id)}>
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
          <span className={`text-xl font-bold ${getHealthScoreColor(location.healthScore)}`}>
            {location.healthScore}%
          </span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-2 rounded-lg border border-muted">
            <div className="text-base font-bold text-foreground">{formatLargeNumber(location.insights.views)}</div>
            <div className="text-xs text-muted-foreground">{t('labels.views')}</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {location.insights.viewsTrend > 0 ? (
                <TrendingUp className={`w-3 h-3 ${getTrendColor(location.insights.viewsTrend)}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getTrendColor(location.insights.viewsTrend)}`} />
              )}
              <span className={getTrendColor(location.insights.viewsTrend)}>
                {Math.abs(location.insights.viewsTrend)}%
              </span>
            </div>
          </div>

          <div className="text-center p-2 rounded-lg border border-muted">
            <div className="text-base font-bold text-foreground">{formatLargeNumber(location.insights.clicks)}</div>
            <div className="text-xs text-muted-foreground">{t('labels.clicks')}</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {location.insights.clicksTrend > 0 ? (
                <TrendingUp className={`w-3 h-3 ${getTrendColor(location.insights.clicksTrend)}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getTrendColor(location.insights.clicksTrend)}`} />
              )}
              <span className={getTrendColor(location.insights.clicksTrend)}>
                {Math.abs(location.insights.clicksTrend)}%
              </span>
            </div>
          </div>

          <div className="text-center p-2 rounded-lg border border-muted">
            <div className="text-base font-bold text-foreground">{formatLargeNumber(location.insights.calls)}</div>
            <div className="text-xs text-muted-foreground">{t('labels.calls')}</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {location.insights.callsTrend > 0 ? (
                <TrendingUp className={`w-3 h-3 ${getTrendColor(location.insights.callsTrend)}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getTrendColor(location.insights.callsTrend)}`} />
              )}
              <span className={getTrendColor(location.insights.callsTrend)}>
                {Math.abs(location.insights.callsTrend)}%
              </span>
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="flex flex-wrap gap-1">
          {location.attributes.slice(0, 3).map((attr, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {attr}
            </Badge>
          ))}
          {location.attributes.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              {t('labels.attributesMore', { count: location.attributes.length - 3 })}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href={`/reviews?location=${location.id}`}>
              <MessageSquare className="w-4 h-4 mr-1" />
              {t('card.reviews')} ({formatLargeNumber(location.reviewCount)})
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
          {t('labels.lastSync')}: {location.lastSync.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Locations Page
export default function LocationsPage() {
  const t = useTranslations('Locations');
  const supabase = createClient();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasGmbAccount, setHasGmbAccount] = useState<boolean | null>(null);
  const router = useRouter();

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user has GMB account first
      const accountRes = await fetch('/api/gmb/accounts');
      const accountData = await accountRes.json();
      const hasAccount = accountData && accountData.length > 0;
      setHasGmbAccount(hasAccount);
      
      // If no account, don't fetch locations
      if (!hasAccount) {
        setLocations([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      
      // Build query params
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
      });
      
      if (searchTerm) params.set('search', searchTerm);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      
      const res = await fetch(`/api/locations/list-data?${params.toString()}`);
      const response = await res.json();
      
      if (!res.ok) throw new Error(response.error || 'Failed to fetch locations list.');
      
      const processedData = (response.data || []).map((loc: any) => ({
        ...loc,
        lastSync: new Date(loc.lastSync),
        rating: parseFloat(loc.rating) || 0,
        healthScore: parseInt(loc.healthScore) || 0,
        reviewCount: parseInt(loc.reviewCount) || 0,
      }));
      
      setLocations(processedData);
      setTotalCount(response.total || 0);
      
      // Extract unique categories from locations
      const uniqueCategories = Array.from(
        new Set(processedData.map((loc: any) => loc.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);
      
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
      setError(error.message || 'Failed to load locations');
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [searchTerm, selectedStatus, selectedCategory]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchLocations();
      toast.success('Locations synced successfully!');
    } catch (error) {
      toast.error('Failed to sync locations');
    } finally {
      setSyncing(false);
    }
  };

  const getOverallStats = () => {
    const totalViews = locations.reduce((sum, loc) => sum + loc.insights.views, 0);
    const totalClicks = locations.reduce((sum, loc) => sum + loc.insights.clicks, 0);
    const avgRating = locations.length > 0 ? locations.reduce((sum, loc) => sum + loc.rating, 0) / locations.length : 0;
    const avgHealthScore = locations.length > 0 ? locations.reduce((sum, loc) => sum + loc.healthScore, 0) / locations.length : 0;
    return { totalViews, totalClicks, avgRating, avgHealthScore };
  };

  const stats = getOverallStats();

  // Show No GMB Account state
  if (!loading && hasGmbAccount === false) {
    return (
      <div className="space-y-6">
        {/* Hero Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="p-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                  <div className="relative bg-primary/10 p-6 rounded-full">
                    <MapPin className="w-16 h-16 text-primary" />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight">{t('noAccount.title')}</h1>
                <p className="text-xl text-muted-foreground">{t('noAccount.subtitle')}</p>
              </div>

              {/* Benefits Grid */}
              <div className="mt-8 mb-8">
                <h3 className="text-lg font-semibold mb-6 text-primary">{t('noAccount.benefits.title')}</h3>
                <div className="grid md:grid-cols-2 gap-4 text-left">
                  <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('noAccount.benefits.manage')}</span>
                  </div>
                  <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('noAccount.benefits.respond')}</span>
                  </div>
                  <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                    <TrendingUpIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('noAccount.benefits.track')}</span>
                  </div>
                  <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('noAccount.benefits.optimize')}</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-base px-8"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/gmb/create-auth-url');
                      const data = await res.json();
                      if (data.authUrl) {
                        window.location.href = data.authUrl;
                      } else {
                        toast.error('Failed to create auth URL');
                      }
                    } catch (error) {
                      toast.error('Failed to connect');
                    }
                  }}
                >
                  <Users className="w-5 h-5 mr-2" />
                  {t('noAccount.connectButton')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => router.push('/features')}
                >
                  {t('noAccount.learnMore')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Preview Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Multi-Location Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage all your business locations from a single, unified dashboard with real-time updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">AI-Powered Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Respond to customer reviews instantly with AI-generated, personalized responses.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track performance metrics, customer insights, and growth trends across all locations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 bg-muted animate-pulse rounded w-64" />
            <div className="h-5 bg-muted animate-pulse rounded w-96" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-40 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Stats Skeletons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-16 mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 w-40 bg-muted animate-pulse rounded" />
              <div className="h-10 w-40 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Cards Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LocationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Failed to load locations</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setError(null);
                  fetchLocations();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing && 'animate-spin'}`} />
            {syncing ? t('actions.syncing') : t('actions.syncAll')}
          </Button>
          <Button onClick={() => router.push('/locations')} variant="secondary">
            <Layers className="w-4 h-4 mr-2" />
            {t('actions.mapView')}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('actions.addLocation')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalLocations')}</CardTitle>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">{t('stats.acrossPlatforms')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalViews')}</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatLargeNumber(stats.totalViews)}</div>
            <p className="text-xs text-muted-foreground">{t('stats.last30Days')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.avgRating')}</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.avgRating || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">{t('stats.acrossLocations')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.avgHealthScore')}</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgHealthScore || 0)}%</div>
            <p className="text-xs text-muted-foreground">{t('stats.optimizationScore')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select onValueChange={setSelectedStatus} value={selectedStatus}>
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
                <SelectItem value="verified">{t('filters.verified')}</SelectItem>
                <SelectItem value="pending">{t('filters.pending')}</SelectItem>
                <SelectItem value="suspended">{t('filters.suspended')}</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setSelectedCategory} value={selectedCategory}>
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder={t('filters.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            onEdit={(id) => {
              toast.info(`Edit location ${id}`);
            }}
            onViewDetails={(id) => {
              toast.info(`View details for ${id}`);
            }}
          />
        ))}
      </div>

      {/* Empty State */}
      {locations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all'
                ? t('empty.filteredMessage')
                : t('empty.defaultMessage')}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('actions.addLocation')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
