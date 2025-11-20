import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeMetric {
  type: 'impression' | 'click' | 'call' | 'direction_request' | 'website_visit' | 'review' | 'question';
  locationId: string;
  locationName: string;
  timestamp: Date;
  value?: number;
  metadata?: Record<string, any>;
}

interface RealtimeSubscription {
  channel: RealtimeChannel;
  listeners: Set<(metric: RealtimeMetric) => void>;
}

export class AnalyticsRealtimeService {
  private static instance: AnalyticsRealtimeService;
  private supabase = createClient();
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private metricsBuffer: RealtimeMetric[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  private constructor() {
    // Start buffer flush interval
    this.bufferFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, 5000); // Flush every 5 seconds
  }

  static getInstance(): AnalyticsRealtimeService {
    if (!AnalyticsRealtimeService.instance) {
      AnalyticsRealtimeService.instance = new AnalyticsRealtimeService();
    }
    return AnalyticsRealtimeService.instance;
  }

  /**
   * Subscribe to real-time analytics updates for specific locations
   */
  subscribeToLocations(
    locationIds: string[],
    callback: (metric: RealtimeMetric) => void
  ): () => void {
    const key = locationIds.sort().join(',');
    
    // Check if subscription already exists
    let subscription = this.subscriptions.get(key);
    
    if (!subscription) {
      // Create new subscription
      const channel = this.supabase!
        .channel(`analytics-${key}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'gmb_performance_metrics',
          filter: locationIds.length > 0
            ? `location_id=in.(${locationIds.join(',')})`
            : undefined!
        }, (payload) => {
          this.handleMetricChange(payload, 'performance');
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'gmb_reviews',
          filter: locationIds.length > 0
            ? `location_id=in.(${locationIds.join(',')})`
            : undefined!
        }, (payload) => {
          this.handleMetricChange(payload, 'review');
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'gmb_questions',
          filter: locationIds.length > 0
            ? `location_id=in.(${locationIds.join(',')})`
            : undefined!
        }, (payload) => {
          this.handleMetricChange(payload, 'question');
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            console.log('Analytics realtime connected');
          }
        });

      subscription = {
        channel,
        listeners: new Set()
      };
      
      this.subscriptions.set(key, subscription);
    }

    // Add listener
    subscription.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      if (subscription) {
        subscription.listeners.delete(callback);
        
        // If no more listeners, remove subscription
        if (subscription.listeners.size === 0) {
          subscription.channel.unsubscribe();
          this.subscriptions.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to aggregated metrics updates
   */
  subscribeToMetricsUpdates(
    callback: (updates: { 
      impressions?: number; 
      clicks?: number; 
      calls?: number;
      reviews?: number;
      questions?: number;
    }) => void,
    interval: number = 10000 // 10 seconds default
  ): () => void {
    const timer = setInterval(async () => {
      try {
        const { data: { user } } = await this.supabase!.auth.getUser();
        if (!user) return;

        // Fetch latest metrics
        const now = new Date();
        const since = new Date(now.getTime() - interval);

        const { data: metrics } = await this.supabase!
          .from('gmb_performance_metrics')
          .select('impressions_total, clicks_total, calls_total')
          .eq('user_id', user.id)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: reviewCount } = await this.supabase!
          .from('gmb_reviews')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', since.toISOString());

        const { data: questionCount } = await this.supabase!
          .from('gmb_questions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', since.toISOString());

        if (metrics || reviewCount || questionCount) {
          callback({
            impressions: metrics?.impressions_total,
            clicks: metrics?.clicks_total,
            calls: metrics?.calls_total,
            reviews: reviewCount?.length || 0,
            questions: questionCount?.length || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch metrics update:', error);
      }
    }, interval);

    return () => clearInterval(timer);
  }

  /**
   * Simulate real-time events for demo purposes
   */
  simulateRealtimeEvents(locationIds: string[]): () => void {
    const events: Array<() => RealtimeMetric> = [
      () => ({
        type: 'impression',
        locationId: locationIds[Math.floor(Math.random() * locationIds.length)],
        locationName: 'Demo Location',
        timestamp: new Date(),
        value: Math.floor(Math.random() * 10) + 1
      }),
      () => ({
        type: 'click',
        locationId: locationIds[Math.floor(Math.random() * locationIds.length)],
        locationName: 'Demo Location',
        timestamp: new Date(),
        value: 1
      }),
      () => ({
        type: 'call',
        locationId: locationIds[Math.floor(Math.random() * locationIds.length)],
        locationName: 'Demo Location',
        timestamp: new Date(),
        value: 1,
        metadata: { duration: Math.floor(Math.random() * 300) + 30 }
      })
    ];

    const interval = setInterval(() => {
      const event = events[Math.floor(Math.random() * events.length)]();
      this.broadcastMetric(event);
    }, Math.random() * 5000 + 2000); // Random interval between 2-7 seconds

    return () => clearInterval(interval);
  }

  private handleMetricChange(payload: any, type: string) {
    const { new: data } = payload;
    if (!data) return;

    let metric: RealtimeMetric;

    switch (type) {
      case 'performance':
        // Map performance metric changes to realtime events
        if (data.impressions_total > 0) {
          metric = {
            type: 'impression',
            locationId: data.location_id,
            locationName: data.location_name || '',
            timestamp: new Date(data.created_at),
            value: data.impressions_total
          };
        } else if (data.clicks_total > 0) {
          metric = {
            type: 'click',
            locationId: data.location_id,
            locationName: data.location_name || '',
            timestamp: new Date(data.created_at),
            value: data.clicks_total
          };
        } else {
          return;
        }
        break;

      case 'review':
        metric = {
          type: 'review',
          locationId: data.location_id,
          locationName: '',
          timestamp: new Date(data.created_at),
          metadata: {
            rating: data.rating,
            hasReply: data.has_reply
          }
        };
        break;

      case 'question':
        metric = {
          type: 'question',
          locationId: data.location_id,
          locationName: '',
          timestamp: new Date(data.created_at),
          metadata: {
            answered: data.answer_status === 'answered'
          }
        };
        break;

      default:
        return;
    }

    this.broadcastMetric(metric);
  }

  private broadcastMetric(metric: RealtimeMetric) {
    // Add to buffer
    this.metricsBuffer.push(metric);

    // Broadcast to all relevant subscriptions
    this.subscriptions.forEach(subscription => {
      subscription.listeners.forEach(listener => {
        try {
          listener(metric);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    });
  }

  private flushBuffer() {
    if (this.metricsBuffer.length === 0) return;

    // Process buffered metrics (e.g., batch save to database)
    // For now, just clear the buffer
    console.log(`Flushing ${this.metricsBuffer.length} metrics`);
    this.metricsBuffer = [];
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clear all subscriptions
    this.subscriptions.forEach(subscription => {
      subscription.channel.unsubscribe();
    });
    this.subscriptions.clear();

    // Clear buffer flush interval
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    this.isConnected = false;
  }
}

// Export singleton instance
export const analyticsRealtimeService = AnalyticsRealtimeService.getInstance();
