'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigationShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { DateRangeControls, type DateRange } from '@/components/dashboard/date-range-controls';
import { ExportShareBar } from '@/components/dashboard/export-share-bar';
import { cn } from '@/lib/utils';

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
import { 
  type DashboardWidgetPreferences, 
  getDashboardPreferences 
} from '@/lib/dashboard-preferences';
import { getDetailedComparisonPeriod } from '@/lib/date-range-utils';

// Regular imports for essential components
import { GMBConnectionManager } from '@/components/gmb/gmb-connection-manager';
import { WeeklyTasksWidget } from '@/components/dashboard/weekly-tasks-widget';
import { BottlenecksWidget } from '@/components/dashboard/bottlenecks-widget';
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar';
import { RealtimeUpdatesIndicator } from '@/components/dashboard/realtime-updates-indicator';

// Import modular components
import { DashboardHeader } from './components/DashboardHeader';
import { GMBConnectionBanner } from './components/GMBConnectionBanner';
import { HealthScoreCard } from './components/HealthScoreCard';
import { DashboardBanner } from '@/components/dashboard/dashboard-banner';
import { useDashboardSnapshot, cacheUtils } from '@/hooks/use-dashboard-cache';
import type { DashboardSnapshot } from '@/types/dashboard';

// Import AI Components
import dynamic from 'next/dynamic';
const AIInsightsPanel = dynamic(() => import('@/components/dashboard/ai/ai-insights-panel').then(mod => ({ default: mod.AIInsightsPanel })), { ssr: false });
const ChatAssistant = dynamic(() => import('@/components/dashboard/ai/chat-assistant').then(mod => ({ default: mod.ChatAssistant })), { ssr: false });
const AutomationInsights = dynamic(() => import('@/components/dashboard/ai/automation-insights').then(mod => ({ default: mod.AutomationInsights })), { ssr: false });

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

export default function DashboardPage() {
  useNavigationShortcuts();
  const router = useRouter();
  const { isMobile, isTablet } = useResponsiveLayout();

  const [gmbConnected, setGmbConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ preset: '30d', start: null, end: null });
  const [widgetPreferences, setWidgetPreferences] = useState<DashboardWidgetPreferences>(getDashboardPreferences());

  const { data: snapshot, loading, error, fetchData } = useDashboardSnapshot();

  const mapSnapshotToDashboardStats = (data: DashboardSnapshot): DashboardStats => ({
    totalLocations: data.locationSummary.totalLocations,
    locationsTrend: 0,
    averageRating: data.reviewStats.averageRating ?? 0,
    allTimeAverageRating: data.reviewStats.averageRating ?? 0,
    ratingTrend: data.kpis.ratingTrendPct ?? 0,
    totalReviews: data.reviewStats.totals.total ?? 0,
    reviewsTrend: data.kpis.reviewTrendPct ?? 0,
    responseRate: data.reviewStats.responseRate ?? 0,
    responseTarget: 100,
    healthScore: data.kpis.healthScore ?? 0,
    pendingReviews: data.reviewStats.totals.pending ?? 0,
    unansweredQuestions: data.questionStats.totals.unanswered ?? 0,
    monthlyComparison: data.monthlyComparison ?? undefined,
    locationHighlights: data.locationHighlights ?? undefined,
    bottlenecks: data.bottlenecks ?? [],
  });

  const snapshotData = snapshot ?? null;

  const syncDetails = useMemo(() => {
    if (!snapshotData) return [];
    return [
      { label: 'Reviews', timestamp: snapshotData.reviewStats.lastSync },
      { label: 'Posts', timestamp: snapshotData.postStats.lastSync },
      { label: 'Questions', timestamp: snapshotData.questionStats.lastSync },
      { label: 'Automation', timestamp: snapshotData.automationStats.lastSync },
    ];
  }, [snapshotData]);

  const quickActionInsights = useMemo(() => {
    const totalLocations = snapshotData?.locationSummary.totalLocations ?? 0;
    const profileCompletenessAverage = snapshotData?.locationSummary.profileCompletenessAverage ?? null;
    const incompleteProfiles = (snapshotData?.locationSummary.locations ?? []).filter((location) => {
      if (typeof location.profileCompleteness !== 'number') return false;
      return location.profileCompleteness < 100;
    }).length;

    return {
      totalLocations,
      profileCompletenessAverage,
      incompleteProfiles,
    };
  }, [snapshotData]);

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

  const currentStats: DashboardStats = snapshotData
    ? {
        ...defaultStats,
        ...mapSnapshotToDashboardStats(snapshotData),
      }
    : defaultStats;

  useEffect(() => {
    if (snapshotData?.locationSummary.lastGlobalSync) {
      setLastDataUpdate(new Date(snapshotData.locationSummary.lastGlobalSync));
    }
  }, [snapshotData?.locationSummary.lastGlobalSync]);

  // Get detailed comparison period for stats cards
  const comparisonDetails = getDetailedComparisonPeriod(dateRange);

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

      // Save user ID for AI components
      setUserId(authUser.id);

      // Check GMB connection status - only active accounts
      const { data: gmbAccounts } = await supabase
        .from("gmb_accounts")
        .select("id, is_active")
        .eq("user_id", authUser.id)
        .eq("is_active", true);

      const activeAccount = gmbAccounts && gmbAccounts.length > 0 ? gmbAccounts[0] : null;
      const hasActiveAccount = !!activeAccount;
      setGmbConnected(hasActiveAccount);
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
      cacheUtils.invalidateOverview();
      fetchData(true); // Force refresh
    };

    window.addEventListener('gmb-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('gmb-sync-complete', handleSyncComplete);
    };
  }, [gmbConnected]);

  // Callback بعد نجاح عمليات GMB (sync/connect/disconnect)
  const handleGMBSuccess = async () => {
    cacheUtils.invalidateOverview();
    await fetchData(true);
    await fetchConnectionStatus();
    router.refresh();
  };

  const handlePreferencesChange = (preferences: DashboardWidgetPreferences) => {
    setWidgetPreferences(preferences);
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6" data-print-root>
      {/* Header - محسن للموبايل */}
      <DashboardHeader onPreferencesChange={handlePreferencesChange} />

      {/* Custom Branding Banner */}
      <DashboardBanner />

      {/* Real-time Updates Indicator */}
      {gmbConnected && (
        <DashboardSection section="Real-time Updates">
          <RealtimeUpdatesIndicator
            lastUpdated={lastDataUpdate}
            onRefresh={() => fetchData(true)}
            isRefreshing={loading}
            autoRefreshInterval={5}
            syncDetails={syncDetails}
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
              <DashboardSection section="GMB Connection">
                <GMBConnectionManager
                  variant="compact"
                  showLastSync={true}
                  onSuccess={handleGMBSuccess}
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
              totalLocations={quickActionInsights.totalLocations}
              profileCompletenessAverage={quickActionInsights.profileCompletenessAverage}
              incompleteProfiles={quickActionInsights.incompleteProfiles}
            />
          </DashboardSection>
        </>
      )}

      {/* Stats Cards - Lazy Loaded */}
      {gmbConnected && (
        <DashboardSection section="Statistics">
          <ResponsiveGrid type="stats" className="gap-4">
            <LazyStatsCards 
              loading={loading} 
              data={currentStats} 
              dateRange={dateRange}
              comparisonDetails={comparisonDetails}
            />
          </ResponsiveGrid>
        </DashboardSection>
      )}

      {/* Weekly Tasks and Bottlenecks */}
      {gmbConnected && (widgetPreferences.showWeeklyTasks || widgetPreferences.showBottlenecks) && (
        <ResponsiveGrid type="main">
          {widgetPreferences.showWeeklyTasks && (
            <DashboardSection section="Weekly Tasks">
              <WeeklyTasksWidget />
            </DashboardSection>
          )}
          {widgetPreferences.showBottlenecks && (
            <DashboardSection section="Bottlenecks">
              <BottlenecksWidget 
                bottlenecks={currentStats.bottlenecks} 
                loading={loading}
              />
            </DashboardSection>
          )}
        </ResponsiveGrid>
      )}

      {/* Performance Charts - Lazy Loaded */}
      {gmbConnected && currentStats.monthlyComparison && (widgetPreferences.showPerformanceComparison || widgetPreferences.showLocationHighlights) && (
        <ResponsiveGrid type="chart">
          {widgetPreferences.showPerformanceComparison && (
            <DashboardSection section="Performance Chart">
              <LazyPerformanceChart
                currentMonthData={currentStats.monthlyComparison.current}
                previousMonthData={currentStats.monthlyComparison.previous}
                loading={loading}
              />
            </DashboardSection>
          )}
          {widgetPreferences.showLocationHighlights && (
            <DashboardSection section="Location Highlights">
              <LazyLocationHighlights
                locations={currentStats.locationHighlights || []}
                loading={loading}
              />
            </DashboardSection>
          )}
        </ResponsiveGrid>
      )}

      {/* AI Insights + Gamification - Lazy Loaded */}
      {gmbConnected && (widgetPreferences.showAIInsights || widgetPreferences.showAchievements) && (
        <ResponsiveGrid type="main">
          {widgetPreferences.showAIInsights && (
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
          )}
          {widgetPreferences.showAchievements && (
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
          )}
        </ResponsiveGrid>
      )}

      {/* Advanced AI Features - New Section */}
      {gmbConnected && userId && (
        <>
          {/* AI Insights Panel - Predictions & Recommendations */}
          <DashboardSection section="AI Insights Panel">
            <AIInsightsPanel userId={userId} />
          </DashboardSection>

          {/* Automation Insights */}
          <DashboardSection section="Automation Insights">
            <AutomationInsights userId={userId} />
          </DashboardSection>

          {/* Floating Chat Assistant */}
          <ChatAssistant userId={userId} />
        </>
      )}
    </div>
  );
}