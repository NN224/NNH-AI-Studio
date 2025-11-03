'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigationShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { LastSyncInfo } from '@/components/dashboard/last-sync-info';
import { WeeklyTasksWidget } from '@/components/dashboard/weekly-tasks-widget';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalLocations: number;
  locationsTrend: number;
  averageRating: number;
  ratingTrend: number;
  totalReviews: number;
  reviewsTrend: number;
  responseRate: number;
  responseTarget: number;
}

export default function DashboardPage() {
  useNavigationShortcuts();
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLocations: 0,
    locationsTrend: 0,
    averageRating: 0,
    ratingTrend: 0,
    totalReviews: 0,
    reviewsTrend: 0,
    responseRate: 0,
    responseTarget: 100,
  });
  
  const [gmbConnected, setGmbConnected] = useState(false);
  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null);
  const [syncSchedule, setSyncSchedule] = useState<string>('manual');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Check authentication
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
        
        // Load sync settings
        if (activeAccount.settings) {
          const schedule = activeAccount.settings.syncSchedule || 'manual';
          setSyncSchedule(schedule);
        }
        
        // Load last sync time
        if (activeAccount.last_sync) {
          setLastSyncTime(new Date(activeAccount.last_sync));
        }
      }

      // Get active GMB account IDs
      const { data: activeAccounts } = await supabase
        .from("gmb_accounts")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("is_active", true);

      const activeAccountIds = activeAccounts?.map(acc => acc.id) || [];

      if (activeAccountIds.length === 0) {
        setStats({
          totalLocations: 0,
          locationsTrend: 0,
          averageRating: 0,
          ratingTrend: 0,
          totalReviews: 0,
          reviewsTrend: 0,
          responseRate: 0,
          responseTarget: 100,
        });
        setLoading(false);
        return;
      }

      // Get active location IDs
      const { data: activeLocationsData } = await supabase
        .from("gmb_locations")
        .select("id")
        .eq("user_id", authUser.id)
        .in("gmb_account_id", activeAccountIds);

      const activeLocationIds = activeLocationsData?.map(loc => loc.id) || [];

      // Get previous period data for comparison
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Fetch all reviews
      const { data: allReviews } = await supabase
        .from("gmb_reviews")
        .select("rating, review_reply, review_date")
        .eq("user_id", authUser.id)
        .in("location_id", activeLocationIds);

      const reviews = allReviews || [];
      
      // Filter reviews by date
      const recentReviews = reviews.filter(review => {
        if (!review.review_date) return false;
        const reviewDate = new Date(review.review_date);
        return reviewDate >= thirtyDaysAgo;
      });

      const previousReviews = reviews.filter(review => {
        if (!review.review_date) return false;
        const reviewDate = new Date(review.review_date);
        return reviewDate >= sixtyDaysAgo && reviewDate < thirtyDaysAgo;
      });

      // Calculate stats
      const totalReviews = reviews.length;
      const newReviews = recentReviews.length;
      const previousReviewsCount = previousReviews.length;
      
      const reviewsTrend = previousReviewsCount > 0
        ? ((newReviews - previousReviewsCount) / previousReviewsCount) * 100
        : newReviews > 0 ? 100 : 0;

      // Calculate average rating
      const ratings = reviews
        .map(r => r.rating)
        .filter(r => r && r > 0);
      
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

      // Calculate previous period average rating
      const previousRatings = previousReviews
        .map(r => r.rating)
        .filter(r => r && r > 0);
      
      const previousAverageRating = previousRatings.length > 0
        ? previousRatings.reduce((sum, r) => sum + r, 0) / previousRatings.length
        : 0;

      const ratingTrend = previousAverageRating > 0
        ? ((averageRating - previousAverageRating) / previousAverageRating) * 100
        : averageRating > 0 ? 100 : 0;

      // Calculate response rate
      const reviewsWithReplies = reviews.filter(r => r.review_reply && r.review_reply.trim().length > 0);
      const responseRate = totalReviews > 0
        ? (reviewsWithReplies.length / totalReviews) * 100
        : 0;

      // Get locations count
      const { data: locationsData } = await supabase
        .from("gmb_locations")
        .select("id, created_at")
        .eq("user_id", authUser.id)
        .in("gmb_account_id", activeAccountIds);

      const totalLocations = locationsData?.length || 0;
      
      // Calculate locations trend (simple: compare current vs previous)
      const recentLocations = locationsData?.filter(loc => {
        if (!loc.created_at) return false;
        const createdDate = new Date(loc.created_at);
        return createdDate >= thirtyDaysAgo;
      }).length || 0;

      const previousLocations = locationsData?.filter(loc => {
        if (!loc.created_at) return false;
        const createdDate = new Date(loc.created_at);
        return createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
      }).length || 0;

      const locationsTrend = previousLocations > 0
        ? ((recentLocations - previousLocations) / previousLocations) * 100
        : recentLocations > 0 ? 100 : 0;

      setStats({
        totalLocations,
        locationsTrend,
        averageRating,
        ratingTrend,
        totalReviews,
        reviewsTrend,
        responseRate,
        responseTarget: 100,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for sync complete events
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
        // Try to get error message from response
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
      
      // Update last sync time
      // API returns { ok: true, ... } or { success: true, ... }
      if (data.ok || data.success) {
        setLastSyncTime(new Date());
        toast.success('Sync completed successfully!');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('gmb-sync-complete', { detail: data }));
        
        // Refresh dashboard data
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
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your GMB Dashboard
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {gmbConnected && (
        <LastSyncInfo
          lastSyncTime={lastSyncTime}
          isSyncing={syncing}
          onSync={handleSync}
          syncSchedule={syncSchedule}
          onDisconnect={handleDisconnect}
          isDisconnecting={disconnecting}
        />
      )}

      <StatsCards loading={loading} data={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyTasksWidget />

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest GMB updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              No recent activity
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

