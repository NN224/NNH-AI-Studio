'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Eye, 
  MousePointer, 
  Phone, 
  Navigation, 
  Globe, 
  MessageSquare,
  Star,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsRealtimeService, type RealtimeMetric } from '@/lib/services/analytics-realtime-service';

interface RealtimeMetricsDisplayProps {
  locationIds: string[];
  simulateData?: boolean;
}

interface MetricCount {
  impressions: number;
  clicks: number;
  calls: number;
  directions: number;
  website: number;
  reviews: number;
  questions: number;
}

interface ActivityItem extends RealtimeMetric {
  id: string;
}

export function RealtimeMetricsDisplay({ locationIds, simulateData = false }: RealtimeMetricsDisplayProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [counts, setCounts] = useState<MetricCount>({
    impressions: 0,
    clicks: 0,
    calls: 0,
    directions: 0,
    website: 0,
    reviews: 0,
    questions: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const countsRef = useRef(counts);
  const activityIdRef = useRef(0);

  useEffect(() => {
    countsRef.current = counts;
  }, [counts]);

  useEffect(() => {
    setIsConnected(true);
    
    // Subscribe to realtime updates
    const unsubscribe = analyticsRealtimeService.subscribeToLocations(
      locationIds,
      (metric) => {
        // Update counts
        setCounts(prev => {
          const newCounts = { ...prev };
          switch (metric.type) {
            case 'impression':
              newCounts.impressions += metric.value || 1;
              break;
            case 'click':
              newCounts.clicks += metric.value || 1;
              break;
            case 'call':
              newCounts.calls += metric.value || 1;
              break;
            case 'direction_request':
              newCounts.directions += metric.value || 1;
              break;
            case 'website_visit':
              newCounts.website += metric.value || 1;
              break;
            case 'review':
              newCounts.reviews += 1;
              break;
            case 'question':
              newCounts.questions += 1;
              break;
          }
          return newCounts;
        });

        // Add to recent activity
        const activityItem: ActivityItem = {
          ...metric,
          id: `activity-${activityIdRef.current++}`
        };
        
        setRecentActivity(prev => [activityItem, ...prev].slice(0, 10));
        setLastUpdate(new Date());
      }
    );

    // Subscribe to aggregated updates
    const unsubscribeAggregated = analyticsRealtimeService.subscribeToMetricsUpdates(
      (updates) => {
        setCounts(prev => ({
          ...prev,
          impressions: updates.impressions || prev.impressions,
          clicks: updates.clicks || prev.clicks,
          calls: updates.calls || prev.calls,
          reviews: updates.reviews || prev.reviews,
          questions: updates.questions || prev.questions
        }));
      },
      30000 // Update every 30 seconds
    );

    // Simulate data if requested (for demo)
    let unsubscribeSimulation: (() => void) | undefined;
    if (simulateData && locationIds.length > 0) {
      unsubscribeSimulation = analyticsRealtimeService.simulateRealtimeEvents(locationIds);
    }

    // Reset counts every hour
    const resetInterval = setInterval(() => {
      setCounts({
        impressions: 0,
        clicks: 0,
        calls: 0,
        directions: 0,
        website: 0,
        reviews: 0,
        questions: 0
      });
      setRecentActivity([]);
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      unsubscribe();
      unsubscribeAggregated();
      unsubscribeSimulation?.();
      clearInterval(resetInterval);
      setIsConnected(false);
    };
  }, [locationIds, simulateData]);

  const metrics = [
    { key: 'impressions', label: 'Impressions', icon: Eye, color: 'text-blue-500' },
    { key: 'clicks', label: 'Clicks', icon: MousePointer, color: 'text-green-500' },
    { key: 'calls', label: 'Calls', icon: Phone, color: 'text-purple-500' },
    { key: 'directions', label: 'Directions', icon: Navigation, color: 'text-orange-500' },
    { key: 'website', label: 'Website Visits', icon: Globe, color: 'text-cyan-500' },
    { key: 'reviews', label: 'Reviews', icon: Star, color: 'text-yellow-500' },
    { key: 'questions', label: 'Questions', icon: MessageSquare, color: 'text-pink-500' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'impression': return Eye;
      case 'click': return MousePointer;
      case 'call': return Phone;
      case 'direction_request': return Navigation;
      case 'website_visit': return Globe;
      case 'review': return Star;
      case 'question': return MessageSquare;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'impression': return 'text-blue-500';
      case 'click': return 'text-green-500';
      case 'call': return 'text-purple-500';
      case 'direction_request': return 'text-orange-500';
      case 'website_visit': return 'text-cyan-500';
      case 'review': return 'text-yellow-500';
      case 'question': return 'text-pink-500';
      default: return 'text-gray-500';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const totalInteractions = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant={isConnected ? "default" : "secondary"}
            className={cn(
              "gap-1",
              isConnected && "bg-green-500 hover:bg-green-600"
            )}
          >
            <div className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-white animate-pulse" : "bg-gray-400"
            )} />
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Last update: {formatTimeAgo(lastUpdate)}
          </span>
        </div>
        {simulateData && (
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Demo Mode
          </Badge>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, color }) => {
          const count = counts[key as keyof MetricCount];
          const percentage = totalInteractions > 0 
            ? (count / totalInteractions) * 100 
            : 0;

          return (
            <Card key={key} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={cn("h-4 w-4", color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={count}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {count.toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <Progress 
                  value={percentage} 
                  className="mt-2 h-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Waiting for new activity...
              </p>
            ) : (
              <AnimatePresence>
                {recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  const color = getActivityColor(activity.type);
                  
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ 
                        duration: 0.3,
                        delay: index * 0.05
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
                    >
                      <Icon className={cn("h-5 w-5 flex-shrink-0", color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.locationName || 'Location'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type.replace(/_/g, ' ')}
                          {activity.value && activity.value > 1 && ` (×${activity.value})`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
