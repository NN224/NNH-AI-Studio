'use client';

import { useQuery } from '@tanstack/react-query';
import { PerformanceChart } from '@/components/charts/PerformanceChart';
import ActivityFeedItem from '@/components/dashboard/ActivityFeedItem';
import QuickActionButton from '@/components/dashboard/QuickActionButton';
import StatCard from '@/components/ui/StatCard';
import { 
  HelpCircle, 
  MessageSquare, 
  PlusCircle, 
  Star,
  TrendingUp,
  Users,
  MapPin,
  BarChart3
} from 'lucide-react';
import { getDashboardStats, getPerformanceChartData, getActivityFeed } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const NewDashboardClient = () => {
  const router = useRouter();

  // Fetch dashboard data using React Query
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ['performanceChartData'],
    queryFn: () => getPerformanceChartData(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activityFeed, isLoading: isLoadingFeed } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => getActivityFeed(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here's your business overview
              </p>
            </div>
            <Button 
              onClick={() => refetchStats()}
              variant="outline"
              size="sm"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Total Reviews"
                value={stats?.total_reviews?.toString() ?? '0'}
                icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                isLoading={isLoadingStats}
                trend={stats?.reviews_trend}
              />
              <StatCard
                title="Average Rating"
                value={Number(stats?.avg_rating ?? 0).toFixed(1)}
                icon={<Star className="h-4 w-4 text-yellow-500" />}
                isLoading={isLoadingStats}
                suffix="/5"
              />
              <StatCard
                title="Pending Reviews"
                value={stats?.pending_reviews?.toString() ?? '0'}
                icon={<MessageSquare className="h-4 w-4 text-orange-500" />}
                isLoading={isLoadingStats}
                alert={Number(stats?.pending_reviews ?? 0) > 0}
              />
              <StatCard
                title="Pending Questions"
                value={stats?.pending_questions?.toString() ?? '0'}
                icon={<HelpCircle className="h-4 w-4 text-blue-500" />}
                isLoading={isLoadingStats}
                alert={Number(stats?.pending_questions ?? 0) > 0}
              />
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart
                  title="Search Views (Last 30 Days)"
                  data={chartData || []}
                  dataKey="value"
                  xAxisKey="date"
                  isLoading={isLoadingChart}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/locations')}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Locations</p>
                      <p className="text-2xl font-bold">{stats?.total_locations ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/reviews')}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Star className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold">{stats?.reviews_this_month ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/analytics')}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Response Rate</p>
                      <p className="text-2xl font-bold">{stats?.response_rate ?? 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionButton
                  icon={<PlusCircle className="h-5 w-5" />}
                  label="Create New Post"
                  onClick={() => router.push('/posts')}
                />
                <QuickActionButton
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Reply to Reviews"
                  onClick={() => router.push('/reviews')}
                />
                <QuickActionButton
                  icon={<HelpCircle className="h-5 w-5" />}
                  label="Answer Questions"
                  onClick={() => router.push('/questions')}
                />
                <QuickActionButton
                  icon={<MapPin className="h-5 w-5" />}
                  label="Manage Locations"
                  onClick={() => router.push('/locations')}
                />
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingFeed ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <ActivityFeedItem 
                        key={index} 
                        icon={<div className="h-5 w-5 bg-muted rounded animate-pulse" />} 
                        message="" 
                        timestamp="" 
                        isLoading={true} 
                      />
                    ))
                  ) : activityFeed && activityFeed.length > 0 ? (
                    activityFeed.slice(0, 5).map((item: any) => (
                      <ActivityFeedItem
                        key={item.id}
                        icon={<Star className="h-5 w-5 text-yellow-500" />}
                        message={item.message || 'Activity'}
                        timestamp={item.created_at || new Date().toISOString()}
                        isLoading={false}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDashboardClient;
