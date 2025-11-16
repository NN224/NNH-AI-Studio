'use client';

import { useQuery } from '@tanstack/react-query';
import { PerformanceChart } from '@/components/charts/PerformanceChart';
import ActivityFeedItem from '@/components/dashboard/ActivityFeedItem';
import QuickActionButton from '@/components/dashboard/QuickActionButton';
import StatCard from '@/components/ui/StatCard';
import { DollarSign, HelpCircle, MessageSquare, PlusCircle, Send, Star, Users } from 'lucide-react';
import { getDashboardStats, getPerformanceChartData, getActivityFeed } from './actions';
import { formatTimeAgo } from '@/lib/utils';

const NewDashboardClient = () => {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => getDashboardStats(),
  });

  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ['performanceChartData'],
    queryFn: () => getPerformanceChartData(),
  });

  const { data: activityFeed, isLoading: isLoadingFeed } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => getActivityFeed(),
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard
              title="Total Reviews"
              value={stats?.total_reviews?.toString() ?? '0'}
              icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Average Rating"
              value={Number(stats?.avg_rating ?? 0).toFixed(1)}
              icon={<Star className="h-4 w-4 text-muted-foreground" />}
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Pending Reviews"
              value={stats?.pending_reviews?.toString() ?? '0'}
              icon={<Star className="h-4 w-4 text-muted-foreground" />}
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Pending Questions"
              value={stats?.pending_questions?.toString() ?? '0'}
              icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
              isLoading={isLoadingStats}
            />
          </div>

          {/* Performance Chart */}
          <PerformanceChart
            title="Performance Overview (Search Views)"
            data={chartData || []}
            dataKey="value"
            xAxisKey="date"
            isLoading={isLoadingChart}
          />
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <QuickActionButton
                icon={<PlusCircle className="h-5 w-5" />}
                label="Add New Post"
              />
              <QuickActionButton
                icon={<MessageSquare className="h-5 w-5" />}
                label="Reply to Review"
              />
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <h2 className="text-lg font-semibold mb-4">Activity Feed</h2>
            <div className="space-y-4">
              {(isLoadingFeed ? Array.from({ length: 5 }) : activityFeed || []).map((item: any, index) =>
                isLoadingFeed ? (
                  <ActivityFeedItem key={index} icon={<div />} message="" timestamp="" isLoading={true} />
                ) : (
                  <ActivityFeedItem
                    key={item.id}
                    icon={<Star className="h-5 w-5 text-yellow-500" />} // Icon can be made dynamic later
                    message={item.activity_message}
                    timestamp={formatTimeAgo(item.created_at)}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDashboardClient;
