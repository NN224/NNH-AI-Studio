'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GMBReview } from '@/lib/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PendingReviewsStats {
  pending: number;
  responseRate: number;
  avgTime: number;
}

export interface UsePendingReviewsResult {
  reviews: (GMBReview & { location_name?: string })[];
  stats: PendingReviewsStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePendingReviews(): UsePendingReviewsResult {
  const supabase = createClient();
  const [reviews, setReviews] = useState<(GMBReview & { location_name?: string })[]>([]);
  const [stats, setStats] = useState<PendingReviewsStats>({
    pending: 0,
    responseRate: 0,
    avgTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const fetchPendingReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/reviews/pending');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
      }

      const result = await response.json();
      setReviews(result.reviews || []);
      setStats(result.stats || { pending: 0, responseRate: 0, avgTime: 0 });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching pending reviews:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPendingReviews();

    // Set up real-time subscription
    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Cleanup previous subscription
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        // Subscribe to review changes
        const channel = supabase
          .channel(`pending-reviews:${user.id}:${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'gmb_reviews',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              if (isMountedRef.current) {
                fetchPendingReviews();
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Pending reviews realtime subscribed');
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Error setting up realtime:', err);
      }
    };

    setupRealtime();

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, fetchPendingReviews]);

  return {
    reviews,
    stats,
    loading,
    error,
    refetch: fetchPendingReviews,
  };
}

