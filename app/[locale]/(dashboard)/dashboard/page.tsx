'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useDashboardRealtime } from '@/lib/hooks/use-dashboard-realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigationShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { LastSyncInfo } from '@/components/dashboard/last-sync-info';
import { WeeklyTasksWidget } from '@/components/dashboard/weekly-tasks-widget';
import { BottlenecksWidget } from '@/components/dashboard/bottlenecks-widget';
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar';
import { RealtimeUpdatesIndicator } from '@/components/dashboard/realtime-updates-indicator';
import { PerformanceComparisonChart } from '@/components/dashboard/performance-comparison-chart';
import { LocationHighlightsCarousel } from '@/components/dashboard/location-highlights-carousel';
import { AIInsightsCard } from '@/components/dashboard/ai-insights-card';
import { Button } from '@/components/ui/button';
import { DateRangeControls, type DateRange } from '@/components/dashboard/date-range-controls';
import { ExportShareBar } from '@/components/dashboard/export-share-bar';
import { GamificationWidget } from '@/components/dashboard/gamification-widget';
import { RefreshCw, Zap, ShieldCheck, Loader2, Star, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/navigation';

interface DashboardStats {
  totalLocations: number;
  locationsTrend: number;
  averageRating: number;
  allTimeAverageRating: number; 
  ratingTrend: number;
  totalReviews: number;
  reviewsTrend: number;
  responseRate: number;
  responseTarget: number;
  healthScore: number;
  pendingReviews: number;
  unansweredQuestions: number;
  monthlyComparison?: {
    current: {
      reviews: number;
      rating: number;
      questions: number;
    };
    previous: {
      reviews: number;
      rating: number;
      questions: number;
    };
  };
  locationHighlights?: Array<{
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    pendingReviews: number;
    ratingChange?: number;
    category: 'top' | 'attention' | 'improved';
  }>;
  bottlenecks: Array<{
    type: 'Response' | 'Content' | 'Compliance' | 'Reviews' | 'General';
    count: number;
    message: string;
    link: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// GMB Connection Banner - Prominent CTA when not connected
const GMBConnectionBanner = () => {
  const t = useTranslations('Dashboard.connectionBanner');
  
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {t('title')}
              </h2>
              <p className="text-muted-foreground text-base max-w-2xl">
                {t('description')}
              </p>
              
              {/* Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-foreground">{t('benefit1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-foreground">{t('benefit2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-foreground">{t('benefit3')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-shrink-0">
            <Button asChild size="lg" className="gap-2 gradient-orange min-w-[200px]">
              <Link href="/settings">
                <Zap className="w-5 h-5" />
                {t('connectButton')}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 min-w-[200px]">
              <a 
                href="https://business.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Star className="w-5 h-5" />
                {t('learnMore')}
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Profile Protection Status - Using local data
const ProfileProtectionStatus = ({ loading, stats }: { loading: boolean; stats: DashboardStats }) => {
  // Calculate protection status based on health score
  const enabled = (stats.healthScore || 0) >= 70;
  const locationsProtected = enabled ? stats.totalLocations : 0;
  const recentAlerts = stats.pendingReviews > 5 || stats.unansweredQuestions > 3 ? 1 : 0;

  if (loading) {
    return (
      <Card className="border-l-4 border-l-gray-300">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4", 
      enabled ? "border-l-green-500" : "border-l-yellow-500"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Profile Protection</CardTitle>
        <ShieldCheck className={cn("w-4 h-4", 
          enabled ? "text-green-500" : "text-yellow-500"
        )} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={cn("text-2xl font-bold", 
            enabled ? "text-green-600" : "text-yellow-600"
          )}>
            {locationsProtected}/{stats.totalLocations}
          </span>
          <div className={cn("px-2 py-1 text-xs border rounded", 
            enabled 
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
          )}>
            {enabled ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div className="space-y-2">
          {enabled ? (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-muted-foreground">Health score above threshold</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span className="text-muted-foreground">Improve health score to activate</span>
            </div>
          )}

          {recentAlerts > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span className="text-muted-foreground">
                Pending items need attention
              </span>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Based on GMB Health Score: {stats.healthScore}%
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/settings">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Manage Protection
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// Active Location Info - Using stats data
const ActiveLocationInfo = ({ loading, stats }: { loading: boolean; stats: DashboardStats }) => {
  // Get best location from highlights if available
  const bestLocation = stats.locationHighlights?.find(loc => loc.category === 'top');
  const locationName = bestLocation?.name || 'Primary Location';
  const locationRating = bestLocation?.rating || stats.averageRating || stats.allTimeAverageRating || 0;

  if (loading) {
    return (
      <Card className="lg:col-span-1 border border-primary/20 flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-1 border border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-primary">Active Location</CardTitle>
        <MapPin className="w-4 h-4 text-primary" />
      </CardHeader>
      <CardContent>
        <h3 className="text-xl font-bold truncate">
          {stats.totalLocations === 0 
            ? "No Locations" 
            : locationName
          }
        </h3>
        {stats.totalLocations > 0 && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            {locationRating.toFixed(1)} / 5.0 Rating
          </p>
        )}
        {stats.totalLocations > 0 && (
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link href={`/locations/${bestLocation?.id || 'default'}`}>
              Go to Location
            </Link>
          </Button>
        )}
        {stats.totalLocations > 1 && (
          <Link href="/locations" className="text-xs text-primary hover:underline mt-1 block text-center">
            Manage {stats.totalLocations - 1} more
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

// Health Score Card with safe defaults
const HealthScoreCard = ({ loading, healthScore, className }: { loading: boolean; healthScore: number; className?: string }) => (
  <Card className={cn("border-l-4", className, 
    healthScore > 80 ? 'border-green-500' : 
    healthScore > 60 ? 'border-yellow-500' : 'border-red-500'
  )}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">GMB Health Score</CardTitle>
      <ShieldCheck className="w-4 h-4 text-primary" />
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          `${healthScore}%`
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Score based on Quality, Visibility, and Compliance.
      </p>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  useNavigationShortcuts();
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLocations: 0,
    locationsTrend: 0,
    averageRating: 0,
    allTimeAverageRating: 0, 
    ratingTrend: 0,
    totalReviews: 0,
    reviewsTrend: 0,
    responseRate: 0,
    responseTarget: 100,
    healthScore: 0,
    pendingReviews: 0,
    unansweredQuestions: 0,
    bottlenecks: [],
  });

  const [gmbConnected, setGmbConnected] = useState(false);
  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null);
  const [syncSchedule, setSyncSchedule] = useState<string>('manual');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ preset: '30d', start: null, end: null });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        // Handle expired/invalid sessions gracefully
        const msg = authError?.message || '';
        const isExpired = msg.includes('session') || msg.includes('expired') || msg.includes('Invalid Refresh Token') || (authError as any)?.code === 'session_expired';
        if (isExpired) {
          try {
            await supabase.auth.signOut();
          } catch {}
          toast.error('Session expired. Please sign in again.');
        } else if (authError) {
          console.error('Authentication error:', authError);
        }
        setCurrentUserId(null);
        router.push("/auth/login");
        return;
      }

      // Store user ID for real-time subscriptions
      setCurrentUserId(authUser.id);

      // Check GMB connection status
      const { data: gmbAccounts } = await supabase
        .from("gmb_accounts")
        .select("id, is_active, settings, last_sync")
        .eq("user_id", authUser.id);

      const activeAccount = gmbAccounts?.find(acc => acc.is_active);
      const hasActiveAccount = !!activeAccount;
      setGmbConnected(hasActiveAccount);

      if (activeAccount) {
        setGmbAccountId(activeAccount.id);

        if (activeAccount.settings) {
          const schedule = activeAccount.settings.syncSchedule || 'manual';
          setSyncSchedule(schedule);
        }

        if (activeAccount.last_sync) {
          setLastSyncTime(new Date(activeAccount.last_sync));
        }
      }

      // Fetch real stats from API with safe defaults
      if (hasActiveAccount) {
        const params = new URLSearchParams();
        const now = new Date();
        if (dateRange.preset !== 'custom') {
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let start = new Date(end);
          if (dateRange.preset === '7d') start.setDate(end.getDate() - 7);
          if (dateRange.preset === '30d') start.setDate(end.getDate() - 30);
          if (dateRange.preset === '90d') start.setDate(end.getDate() - 90);
          params.set('start', start.toISOString());
          params.set('end', end.toISOString());
        } else if (dateRange.start && dateRange.end) {
          params.set('start', dateRange.start.toISOString());
          params.set('end', dateRange.end.toISOString());
        }

        const statsRes = await fetch(`/api/dashboard/stats?${params.toString()}`);
        if (statsRes.ok) {
          const newStats = await statsRes.json();
          setStats({
            totalLocations: newStats.totalLocations || 0,
            locationsTrend: newStats.locationsTrend || 0,
            averageRating: newStats.recentAverageRating || 0,
            allTimeAverageRating: newStats.allTimeAverageRating || 0,
            ratingTrend: newStats.ratingTrend || 0,
            totalReviews: newStats.totalReviews || 0,
            reviewsTrend: newStats.reviewsTrend || 0,
            responseRate: newStats.responseRate || 0,
            responseTarget: 100,
            healthScore: newStats.healthScore || 0,
            pendingReviews: newStats.pendingReviews || 0,
            unansweredQuestions: newStats.unansweredQuestions || 0,
            monthlyComparison: newStats.monthlyComparison,
            locationHighlights: newStats.locationHighlights || [],
            bottlenecks: newStats.bottlenecks || [],
          });
        } else if (statsRes.status === 401) {
          // Unauthenticated from API -> sign out and redirect
          try {
            await supabase.auth.signOut();
          } catch {}
          toast.error('Your session has expired. Please sign in again.');
          router.push('/auth/login');
          return;
        } else {
          // Other API error
          let msg = 'Failed to load dashboard stats';
          try {
            const err = await statsRes.json();
            msg = err?.error || msg;
          } catch {}
          toast.error(msg);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setLastDataUpdate(new Date());
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSyncComplete = () => {
      fetchDashboardData();
    };

    window.addEventListener('gmb-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('gmb-sync-complete', handleSyncComplete);
    };
  }, []);

  // Real-time subscriptions for live updates
  useDashboardRealtime(currentUserId, () => {
    console.log('📡 Real-time update received, refreshing dashboard...');
    fetchDashboardData();
  });

  const handleSync = async () => {
    if (!gmbAccountId) {
      toast.error('No GMB account connected');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: gmbAccountId, sync_type: 'full' }),
      });

      if (!response.ok) {
        let errorMessage = 'Sync failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Sync failed: ${response.status}`;
        } catch {
          errorMessage = `Sync failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.ok || data.success) {
        setLastSyncTime(new Date());
        toast.success('Sync completed successfully!');
        window.dispatchEvent(new CustomEvent('gmb-sync-complete', { detail: data }));
        await fetchDashboardData();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!gmbAccountId) {
      toast.error('No GMB account connected');
      return;
    }

    if (!confirm('Are you sure you want to disconnect Google My Business? Sync will stop but your data will be preserved.')) {
      return;
    }

    try {
      setDisconnecting(true);
      const response = await fetch('/api/gmb/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: gmbAccountId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to disconnect');
      }

      toast.success('Google My Business disconnected successfully');
      setGmbConnected(false);
      setGmbAccountId(null);
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-8" data-print-root>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Command Center</h1>
          <p className="text-muted-foreground mt-2">
            Proactive risk and growth orchestration dashboard
          </p>
        </div>
      </div>

      {/* Real-time Updates Indicator */}
      {gmbConnected && (
        <RealtimeUpdatesIndicator
          lastUpdated={lastDataUpdate}
          onRefresh={fetchDashboardData}
          isRefreshing={loading}
          autoRefreshInterval={5}
        />
      )}

      {/* Date Range Controls & Export/Share */}
      {gmbConnected && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2">
          <DateRangeControls
            value={dateRange}
            onChange={setDateRange}
            onApply={fetchDashboardData}
          />
          <ExportShareBar
            getShareParams={() => {
              const params: Record<string, string> = {};
              if (dateRange.preset) params.preset = dateRange.preset;
              if (dateRange.start) params.start = dateRange.start.toISOString();
              if (dateRange.end) params.end = dateRange.end.toISOString();
              return params;
            }}
          />
        </div>
      )}

      {/* GMB Connection Status */}
      {gmbConnected && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <LastSyncInfo
            lastSyncTime={lastSyncTime}
            isSyncing={syncing}
            onSync={handleSync}
            syncSchedule={syncSchedule}
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnecting}
            className="lg:col-span-3"
          />
          <ActiveLocationInfo loading={loading} stats={stats} />
        </div>
      )}

      {/* GMB Connection Banner - Show when not connected */}
      {!gmbConnected && <GMBConnectionBanner />}

      {/* Quick Actions Bar - Only show when connected */}
      {gmbConnected && (
        <QuickActionsBar 
          pendingReviews={stats.pendingReviews}
          unansweredQuestions={stats.unansweredQuestions}
          onSync={handleSync}
          isSyncing={syncing}
        />
      )}

      {/* Health Score and Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <HealthScoreCard loading={loading} healthScore={stats.healthScore || 0} className="sm:col-span-2 lg:col-span-1" />
        <div className="sm:col-span-2 lg:col-span-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCards loading={loading} data={stats} />
        </div>
      </div>

      {/* Weekly Tasks and AI Feed */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2">
        <WeeklyTasksWidget />

        <div className="space-y-4">
          <ProfileProtectionStatus loading={loading} stats={stats} />
          
          {/* Bottlenecks Widget - يعرض المشاكل والفرص */}
          <BottlenecksWidget 
            bottlenecks={stats.bottlenecks} 
            loading={loading}
          />
        </div>
      </div>

      {/* Performance Charts and Location Highlights */}
      {gmbConnected && stats.monthlyComparison && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2">
          <PerformanceComparisonChart
            currentMonthData={stats.monthlyComparison.current}
            previousMonthData={stats.monthlyComparison.previous}
            loading={loading}
          />
          
          <LocationHighlightsCarousel
            locations={stats.locationHighlights || []}
            loading={loading}
          />
        </div>
      )}

      {/* AI Insights + Gamification */}
      {gmbConnected && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2">
          <AIInsightsCard
            stats={{
              totalReviews: stats.totalReviews,
              averageRating: stats.averageRating,
              responseRate: stats.responseRate,
              pendingReviews: stats.pendingReviews,
              unansweredQuestions: stats.unansweredQuestions,
              ratingTrend: stats.ratingTrend,
              reviewsTrend: stats.reviewsTrend
            }}
            loading={loading}
          />
          <GamificationWidget
            stats={{
              healthScore: stats.healthScore,
              responseRate: stats.responseRate,
              averageRating: stats.averageRating,
              totalReviews: stats.totalReviews,
              pendingReviews: stats.pendingReviews,
            }}
          />
        </div>
      )}
    </div>
  );
}