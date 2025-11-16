'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
  MapPin,
  BarChart3,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { getDashboardStats, getPerformanceChartData, getActivityFeed } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import MiniChat from '@/components/dashboard/ai/MiniChat';
import BusinessHeader from '@/components/dashboard/BusinessHeader';
import AIInsightsCards from '@/components/dashboard/ai/AIInsightsCards';
import AutopilotStatus from '@/components/dashboard/ai/AutopilotStatus';
import PerformancePredictor from '@/components/dashboard/ai/PerformancePredictor';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
};

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

  const handleRefresh = async () => {
    toast.promise(
      Promise.all([refetchStats()]),
      {
        loading: 'Refreshing dashboard...',
        success: 'Dashboard updated!',
        error: 'Failed to refresh',
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div 
        className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here's your business overview
              </p>
            </div>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="gap-2 hover:scale-105 transition-transform"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-6">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business header */}
            <motion.div variants={itemVariants}>
              <BusinessHeader />
            </motion.div>

            {/* AI Insights + Mini Chat */}
            <motion.div variants={itemVariants}>
              <div className="space-y-4">
                <AIInsightsCards stats={stats as any} />
                <MiniChat stats={stats as any} activityFeed={activityFeed as any} />
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              variants={itemVariants}
            >
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <StatCard
                  title="Total Reviews"
                  value={stats?.total_reviews?.toString() ?? '0'}
                  icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                  isLoading={isLoadingStats}
                  trend={stats?.reviews_trend}
                />
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <StatCard
                  title="Average Rating"
                  value={Number(stats?.avg_rating ?? 0).toFixed(1)}
                  icon={<Star className="h-4 w-4 text-yellow-500" />}
                  isLoading={isLoadingStats}
                  suffix="/5"
                />
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <StatCard
                  title="Pending Reviews"
                  value={stats?.pending_reviews?.toString() ?? '0'}
                  icon={<MessageSquare className="h-4 w-4 text-orange-500" />}
                  isLoading={isLoadingStats}
                  alert={Number(stats?.pending_reviews ?? 0) > 0}
                />
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <StatCard
                  title="Pending Questions"
                  value={stats?.pending_questions?.toString() ?? '0'}
                  icon={<HelpCircle className="h-4 w-4 text-blue-500" />}
                  isLoading={isLoadingStats}
                  alert={Number(stats?.pending_questions ?? 0) > 0}
                />
              </motion.div>
            </motion.div>

            {/* Performance Chart */}
            <motion.div variants={itemVariants}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
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
                  <div className="mt-4">
                    <PerformancePredictor data={chartData as any || []} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              variants={itemVariants}
            >
              <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.2 }}>
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/50" 
                  onClick={() => router.push('/locations')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="p-3 bg-primary/10 rounded-lg"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <MapPin className="h-5 w-5 text-primary" />
                      </motion.div>
                      <div>
                        <p className="text-sm text-muted-foreground">Locations</p>
                        <p className="text-2xl font-bold">{stats?.total_locations ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.2 }}>
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-yellow-500/20 hover:border-yellow-500/50" 
                  onClick={() => router.push('/reviews')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="p-3 bg-yellow-500/10 rounded-lg"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Star className="h-5 w-5 text-yellow-500" />
                      </motion.div>
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold">{stats?.reviews_this_month ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.2 }}>
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-green-500/20 hover:border-green-500/50" 
                  onClick={() => router.push('/analytics')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="p-3 bg-green-500/10 rounded-lg"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </motion.div>
                      <div>
                        <p className="text-sm text-muted-foreground">Response Rate</p>
                        <p className="text-2xl font-bold">{stats?.response_rate ?? 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Autopilot Control */}
            <motion.div variants={itemVariants}>
              <AutopilotStatus />
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <motion.div whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                    <QuickActionButton
                      icon={<PlusCircle className="h-5 w-5" />}
                      label="Create New Post"
                      onClick={() => router.push('/posts')}
                    />
                  </motion.div>
                  <motion.div whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                    <QuickActionButton
                      icon={<MessageSquare className="h-5 w-5" />}
                      label="Reply to Reviews"
                      onClick={() => router.push('/reviews')}
                    />
                  </motion.div>
                  <motion.div whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                    <QuickActionButton
                      icon={<HelpCircle className="h-5 w-5" />}
                      label="Answer Questions"
                      onClick={() => router.push('/questions')}
                    />
                  </motion.div>
                  <motion.div whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                    <QuickActionButton
                      icon={<MapPin className="h-5 w-5" />}
                      label="Manage Locations"
                      onClick={() => router.push('/locations')}
                    />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Activity Feed */}
            <motion.div variants={itemVariants}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingFeed ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <ActivityFeedItem 
                            icon={<div className="h-5 w-5 bg-muted rounded animate-pulse" />} 
                            message="" 
                            timestamp="" 
                            isLoading={true} 
                          />
                        </motion.div>
                      ))
                    ) : activityFeed && activityFeed.length > 0 ? (
                      activityFeed.slice(0, 5).map((item: any, index: number) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ x: 5 }}
                        >
                          <ActivityFeedItem
                            icon={<Star className="h-5 w-5 text-yellow-500" />}
                            message={item.message || 'Activity'}
                            timestamp={item.created_at || new Date().toISOString()}
                            isLoading={false}
                          />
                        </motion.div>
                      ))
                    ) : (
                      <motion.p 
                        className="text-sm text-muted-foreground text-center py-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        No recent activity
                      </motion.p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewDashboardClient;
