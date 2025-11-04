'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
import { Button } from '@/components/ui/button';
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

// GMB Setup Prompt
const GMBSetupPrompt = () => {
  return (
    <Card className="lg:col-span-4 border-2 border-dashed border-primary/50 bg-primary/10">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Connect Google My Business</h3>
            <p className="text-sm text-muted-foreground">Sync your locations, reviews, and analytics data.</p>
          </div>
        </div>
        <Button asChild size="lg" className="gap-2 flex-shrink-0">
          <Link href="/settings"> 
            <Zap className="w-5 h-5" />
            Start Setup
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// Profile Protection Status
const ProfileProtectionStatus = ({ loading }: { loading: boolean }) => {
  const [protectionData, setProtectionData] = useState<{
    enabled: boolean;
    locationsProtected: number;
    totalLocations: number;
    recentAlerts: number;
    lastCheck: Date | null;
  } | null>(null);

  useEffect(() => {
    const fetchProtectionStatus = async () => {
      try {
        const response = await fetch('/api/profile-protection/status');
        if (response.ok) {
          const data = await response.json();
          setProtectionData({
            enabled: data.enabled || false,
            locationsProtected: data.locationsProtected || 0,
            totalLocations: data.totalLocations || 0,
            recentAlerts: data.recentAlerts || 0,
            lastCheck: data.lastCheck ? new Date(data.lastCheck) : null
          });
        }
      } catch (error) {
        console.error('Failed to fetch protection status:', error);
        // Set default values on error
        setProtectionData({
          enabled: false,
          locationsProtected: 0,
          totalLocations: 0,
          recentAlerts: 0,
          lastCheck: null
        });
      }
    };

    fetchProtectionStatus();
  }, []);

  if (loading || !protectionData) {
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
      protectionData.enabled ? "border-l-green-500" : "border-l-yellow-500"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Profile Protection</CardTitle>
        <ShieldCheck className={cn("w-4 h-4", 
          protectionData.enabled ? "text-green-500" : "text-yellow-500"
        )} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={cn("text-2xl font-bold", 
            protectionData.enabled ? "text-green-600" : "text-yellow-600"
          )}>
            {protectionData.locationsProtected}/{protectionData.totalLocations}
          </span>
          <div className={cn("px-2 py-1 text-xs border rounded", 
            protectionData.enabled 
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
          )}>
            {protectionData.enabled ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div className="space-y-2">
          {protectionData.enabled ? (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-muted-foreground">All locations monitored</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span className="text-muted-foreground">Protection disabled</span>
            </div>
          )}

          {protectionData.recentAlerts > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span className="text-muted-foreground">
                {protectionData.recentAlerts} alert{protectionData.recentAlerts > 1 ? 's' : ''} this week
              </span>
            </div>
          )}

          {protectionData.lastCheck && (
            <div className="text-xs text-muted-foreground">
              Last check: {protectionData.lastCheck.toLocaleTimeString()}
            </div>
          )}
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

// Active Location Info
const ActiveLocationInfo = ({ loading, stats }: { loading: boolean; stats: DashboardStats }) => {
  const [activeLocation, setActiveLocation] = useState<{
    name: string;
    rating: number;
  } | null>(null);

  useEffect(() => {
    const fetchActiveLocation = async () => {
      try {
        const response = await fetch('/api/locations/active');
        if (response.ok) {
          const data = await response.json();
          setActiveLocation({
            name: data.name || 'Unknown Location',
            rating: data.rating || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch active location:', error);
        // Set default values on error
        setActiveLocation({
          name: 'Default Location',
          rating: 0
        });
      }
    };

    if (stats.totalLocations > 0) {
      fetchActiveLocation();
    }
  }, [stats.totalLocations]);

  if (loading) {
    return (
      <Card className="lg:col-span-1 border border-primary/20 flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </Card>
    );
  }

  const safeRating = activeLocation?.rating || stats.allTimeAverageRating || 0;

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
            : activeLocation?.name || "Loading..."
          }
        </h3>
        {stats.totalLocations > 0 && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            {safeRating.toFixed(1)} / 5.0 Rating
          </p>
        )}
        {stats.totalLocations > 1 && (
          <Link href="/locations" className="text-xs text-primary hover:underline mt-1 block">
            Manage {stats.totalLocations - 1} more
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error("Authentication error:", authError);
        router.push("/auth/login");
        return;
      }

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
        const statsRes = await fetch('/api/dashboard/stats');
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

  // Health Score Card with safe defaults
  const HealthScoreCard = () => (
    <Card className={cn("lg:col-span-1 border-l-4", 
      (stats.healthScore || 0) > 80 ? 'border-green-500' : 
      (stats.healthScore || 0) > 60 ? 'border-yellow-500' : 'border-red-500'
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
            `${(stats.healthScore || 0)}%`
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Score based on Quality, Visibility, and Compliance.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
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

      {/* GMB Connection Status */}
      {gmbConnected && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* GMB Setup Prompt */}
      {!gmbConnected && <GMBSetupPrompt />}

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
      <div className="grid gap-4 lg:grid-cols-5">
        <HealthScoreCard />
        <div className="lg:col-span-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCards loading={loading} data={stats} />
        </div>
      </div>

      {/* Weekly Tasks and AI Feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyTasksWidget />

        <div className="space-y-4">
          <ProfileProtectionStatus loading={loading} />
          
          {/* Bottlenecks Widget - يعرض المشاكل والفرص */}
          <BottlenecksWidget 
            bottlenecks={stats.bottlenecks} 
            loading={loading}
          />
        </div>
      </div>

      {/* Performance Comparison Chart */}
      {gmbConnected && stats.monthlyComparison && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PerformanceComparisonChart
            currentMonthData={stats.monthlyComparison.current}
            previousMonthData={stats.monthlyComparison.previous}
            loading={loading}
          />
          
          {/* Location Highlights Carousel */}
          <LocationHighlightsCarousel
            locations={stats.locationHighlights || []}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}