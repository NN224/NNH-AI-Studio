'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigationShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { DateRangeControls, type DateRange } from '@/components/dashboard/date-range-controls';
import { ExportShareBar } from '@/components/dashboard/export-share-bar';
import { RefreshCw, Zap, ShieldCheck, Loader2, Star, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/navigation';

// Import optimized components
import { DashboardSection } from '@/components/dashboard/dashboard-error-boundary';
import { ResponsiveGrid, useResponsiveLayout } from '@/components/dashboard/responsive-layout';
import { 
  LazyStatsCards, 
  LazyPerformanceChart, 
  LazyLocationHighlights, 
  LazyAIInsights, 
  LazyGamificationWidget 
} from '@/components/dashboard/lazy-dashboard-components';
import { useDashboardStats, cacheUtils } from '@/hooks/use-dashboard-cache';

// Regular imports for essential components
import { LastSyncInfo } from '@/components/dashboard/last-sync-info';
import { WeeklyTasksWidget } from '@/components/dashboard/weekly-tasks-widget';
import { BottlenecksWidget } from '@/components/dashboard/bottlenecks-widget';
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar';
import { RealtimeUpdatesIndicator } from '@/components/dashboard/realtime-updates-indicator';

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

// GMB Connection Banner - مُحسَّن للموبايل
const GMBConnectionBanner = () => {
  const t = useTranslations('Dashboard.connectionBanner');
  const { isMobile } = useResponsiveLayout();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Call the existing GMB auth URL endpoint
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start GMB connection');
      }
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      } else {
        throw new Error('No OAuth URL returned');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect. Please try again or go to Settings.');
      setConnecting(false);
      // Fallback to settings page
      router.push('/settings');
    }
  };
  
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <CardContent className={cn("p-4 md:p-8")}>
        <div className={cn(
          "flex gap-4 md:gap-6",
          isMobile ? "flex-col items-start" : "flex-col lg:flex-row items-start lg:items-center"
        )}>
          {/* Icon and Title */}
          <div className="flex items-start gap-3 md:gap-4 flex-1">
            <div className={cn(
              "rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20",
              isMobile ? "w-12 h-12" : "w-16 h-16"
            )}>
              <MapPin className={cn("text-primary", isMobile ? "w-6 h-6" : "w-8 h-8")} />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>
                {t('title')}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                {t('description')}
              </p>
              
              {/* Benefits Grid - مُحسَّن للموبايل */}
              <div className={cn(
                "grid gap-2 md:gap-4 pt-3 md:pt-4",
                isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
              )}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">{t('benefit1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">{t('benefit2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">{t('benefit3')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons - مُحسَّن للموبايل */}
          <div className={cn(
            "flex gap-2 md:gap-3 w-full lg:w-auto lg:flex-shrink-0",
            isMobile ? "flex-col" : "flex-col sm:flex-row"
          )}>
            <Button 
              size={isMobile ? "default" : "lg"} 
              className="gap-2 gradient-orange"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                  Connect Google My Business
                </>
              )}
            </Button>
            <Button asChild size={isMobile ? "default" : "lg"} variant="outline" className="gap-2">
              <a 
                href="https://business.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Star className="w-4 h-4 md:w-5 md:h-5" />
                {t('learnMore')}
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Health Score Card محسن
const HealthScoreCard = ({ loading, healthScore }: { loading: boolean; healthScore: number }) => {
  const { isMobile } = useResponsiveLayout();
  
  return (
    <Card className={cn("border-l-4", 
      healthScore > 80 ? 'border-green-500' : 
      healthScore > 60 ? 'border-yellow-500' : 'border-red-500'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>
          GMB Health Score
        </CardTitle>
        <ShieldCheck className={cn("text-primary", isMobile ? "w-3 h-3" : "w-4 h-4")} />
      </CardHeader>
      <CardContent>
        <div className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            `${healthScore}%`
          )}
        </div>
        <p className={cn("text-muted-foreground mt-1", isMobile ? "text-xs" : "text-xs")}>
          Score based on Quality, Visibility, and Compliance.
        </p>
      </CardContent>
    </Card>
  );
};

export default function OptimizedDashboardPage() {
  useNavigationShortcuts();
  const router = useRouter();
  const { isMobile, isTablet } = useResponsiveLayout();

  const [gmbConnected, setGmbConnected] = useState(false);
  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null);
  const [syncSchedule, setSyncSchedule] = useState<string>('manual');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ preset: '30d', start: null, end: null });

  // استخدام الـ cached data fetching
  const { data: stats, loading, error, fetchData, invalidate } = useDashboardStats(dateRange);

  // Default stats في حالة عدم وجود بيانات
  const defaultStats: DashboardStats = {
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
  };

  const currentStats: DashboardStats = stats ? {
    ...defaultStats,
    ...stats
  } : defaultStats;

  const fetchConnectionStatus = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        router.push("/auth/login");
        return;
      }

      // Check GMB connection status - only active accounts
      const { data: gmbAccounts } = await supabase
        .from("gmb_accounts")
        .select("id, is_active, settings, last_sync")
        .eq("user_id", authUser.id)
        .eq("is_active", true);

      const activeAccount = gmbAccounts && gmbAccounts.length > 0 ? gmbAccounts[0] : null;
      const hasActiveAccount = !!activeAccount;
      setGmbConnected(hasActiveAccount);

      if (activeAccount) {
        setGmbAccountId(activeAccount.id);
        if (activeAccount.settings) {
          setSyncSchedule(activeAccount.settings.syncSchedule || 'manual');
        }
        if (activeAccount.last_sync) {
          setLastSyncTime(new Date(activeAccount.last_sync));
        }
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
    
    // Load stats if connected
    if (gmbConnected) {
      fetchData();
    }

    const handleSyncComplete = () => {
      cacheUtils.invalidateStats();
      fetchData(true); // Force refresh
    };

    window.addEventListener('gmb-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('gmb-sync-complete', handleSyncComplete);
    };
  }, [gmbConnected]);

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
        body: JSON.stringify({ accountId: gmbAccountId, syncType: 'full' }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const data = await response.json();
      if (data.ok || data.success) {
        setLastSyncTime(new Date());
        toast.success('Sync completed successfully!');
        cacheUtils.invalidateStats();
        await fetchData(true);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!gmbAccountId || !confirm('Are you sure you want to disconnect?')) return;

    try {
      setDisconnecting(true);
      const response = await fetch('/api/gmb/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: gmbAccountId }),
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      toast.success('Disconnected successfully');
      setGmbConnected(false);
      setGmbAccountId(null);
      cacheUtils.clear();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6" data-print-root>
      {/* Header - محسن للموبايل */}
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={cn("font-bold tracking-tight", isMobile ? "text-2xl" : "text-3xl")}>
            AI Command Center
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1 md:mt-2">
            Proactive risk and growth orchestration dashboard
          </p>
        </div>
      </div>

      {/* Real-time Updates Indicator */}
      {gmbConnected && (
        <DashboardSection section="Real-time Updates">
          <RealtimeUpdatesIndicator
            lastUpdated={lastDataUpdate}
            onRefresh={() => fetchData(true)}
            isRefreshing={loading}
            autoRefreshInterval={5}
          />
        </DashboardSection>
      )}

      {/* Date Range Controls & Export/Share */}
      {gmbConnected && (
        <ResponsiveGrid type="main" className="!grid-cols-1 lg:!grid-cols-2">
          <DashboardSection section="Date Controls">
            <DateRangeControls
              value={dateRange}
              onChange={setDateRange}
              onApply={() => fetchData(true)}
            />
          </DashboardSection>
          <DashboardSection section="Export Controls">
            <ExportShareBar
              getShareParams={() => {
                const params: Record<string, string> = {};
                if (dateRange.preset) params.preset = dateRange.preset;
                if (dateRange.start) params.start = dateRange.start.toISOString();
                if (dateRange.end) params.end = dateRange.end.toISOString();
                return params;
              }}
            />
          </DashboardSection>
        </ResponsiveGrid>
      )}

      {/* GMB Connection Banner */}
      {!gmbConnected && (
        <DashboardSection section="Connection Banner">
          <GMBConnectionBanner />
        </DashboardSection>
      )}

      {/* Connection Status and Quick Actions */}
      {gmbConnected && (
        <>
          <ResponsiveGrid type="main" className="!grid-cols-1 md:!grid-cols-4">
            <div className="md:col-span-3">
              <DashboardSection section="Sync Info">
                <LastSyncInfo
                  lastSyncTime={lastSyncTime}
                  isSyncing={syncing}
                  onSync={handleSync}
                  syncSchedule={syncSchedule}
                  onDisconnect={handleDisconnect}
                  isDisconnecting={disconnecting}
                />
              </DashboardSection>
            </div>
            <DashboardSection section="Health Score">
              <HealthScoreCard loading={loading} healthScore={currentStats.healthScore} />
            </DashboardSection>
          </ResponsiveGrid>

          <DashboardSection section="Quick Actions">
            <QuickActionsBar 
              pendingReviews={currentStats.pendingReviews}
              unansweredQuestions={currentStats.unansweredQuestions}
              onSync={handleSync}
              isSyncing={syncing}
            />
          </DashboardSection>
        </>
      )}

      {/* Stats Cards - Lazy Loaded */}
      {gmbConnected && (
        <DashboardSection section="Statistics">
          <LazyStatsCards loading={loading} data={currentStats} />
        </DashboardSection>
      )}

      {/* Weekly Tasks and Bottlenecks */}
      {gmbConnected && (
        <ResponsiveGrid type="main">
          <DashboardSection section="Weekly Tasks">
            <WeeklyTasksWidget />
          </DashboardSection>
          <DashboardSection section="Bottlenecks">
            <BottlenecksWidget 
              bottlenecks={currentStats.bottlenecks} 
              loading={loading}
            />
          </DashboardSection>
        </ResponsiveGrid>
      )}

      {/* Performance Charts - Lazy Loaded */}
      {gmbConnected && currentStats.monthlyComparison && (
        <ResponsiveGrid type="chart">
          <DashboardSection section="Performance Chart">
            <LazyPerformanceChart
              currentMonthData={currentStats.monthlyComparison.current}
              previousMonthData={currentStats.monthlyComparison.previous}
              loading={loading}
            />
          </DashboardSection>
          <DashboardSection section="Location Highlights">
            <LazyLocationHighlights
              locations={currentStats.locationHighlights || []}
              loading={loading}
            />
          </DashboardSection>
        </ResponsiveGrid>
      )}

      {/* AI Insights + Gamification - Lazy Loaded */}
      {gmbConnected && (
        <ResponsiveGrid type="main">
          <DashboardSection section="AI Insights">
            <LazyAIInsights
              stats={{
                totalReviews: currentStats.totalReviews,
                averageRating: currentStats.averageRating,
                responseRate: currentStats.responseRate,
                pendingReviews: currentStats.pendingReviews,
                unansweredQuestions: currentStats.unansweredQuestions,
                ratingTrend: currentStats.ratingTrend,
                reviewsTrend: currentStats.reviewsTrend
              }}
              loading={loading}
            />
          </DashboardSection>
          <DashboardSection section="Gamification">
            <LazyGamificationWidget
              stats={{
                healthScore: currentStats.healthScore,
                responseRate: currentStats.responseRate,
                averageRating: currentStats.averageRating,
                totalReviews: currentStats.totalReviews,
                pendingReviews: currentStats.pendingReviews,
              }}
            />
          </DashboardSection>
        </ResponsiveGrid>
      )}
    </div>
  );
}