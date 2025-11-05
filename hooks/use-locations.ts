'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Location } from '@/components/locations/location-types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LocationFilters {
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'inactive' | 'needs_attention';
  ratingMin?: number;
  ratingMax?: number;
  healthScoreMin?: number;
  healthScoreMax?: number;
  reviewCountMin?: number;
  reviewCountMax?: number;
  dateRange?: 'last_sync' | 'created';
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  quickFilter?: 'needs_attention' | 'top_performers' | null;
  sortBy?: 'name' | 'rating' | 'reviews' | 'healthScore' | 'lastSync';
  sortOrder?: 'asc' | 'desc';
}

export interface UseLocationsResult {
  locations: Location[];
  loading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useLocations(
  filters: LocationFilters = {},
  pageSize: number = 20
): UseLocationsResult {
  const supabase = createClient();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const fetchLocations = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Build query
      let query = supabase
        .from('gmb_locations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Apply filters
      if (filters.search) {
        const sanitizedSearch = filters.search.trim().slice(0, 100).replace(/%/g, '\\%').replace(/_/g, '\\_');
        if (sanitizedSearch) {
          query = query.or(`location_name.ilike.%${sanitizedSearch}%,address.ilike.%${sanitizedSearch}%`);
        }
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Rating range filter
      if (filters.ratingMin !== undefined) {
        query = query.gte('rating', filters.ratingMin);
      }
      if (filters.ratingMax !== undefined) {
        query = query.lte('rating', filters.ratingMax);
      }

      // Health score range filter
      if (filters.healthScoreMin !== undefined) {
        query = query.gte('health_score', filters.healthScoreMin);
      }
      if (filters.healthScoreMax !== undefined) {
        query = query.lte('health_score', filters.healthScoreMax);
      }

      // Review count range filter
      if (filters.reviewCountMin !== undefined) {
        query = query.gte('review_count', filters.reviewCountMin);
      }
      if (filters.reviewCountMax !== undefined) {
        query = query.lte('review_count', filters.reviewCountMax);
      }

      // Date range filter
      if (filters.dateRange && filters.dateFrom && filters.dateTo) {
        const dateField = filters.dateRange === 'last_sync' ? 'updated_at' : 'created_at';
        query = query.gte(dateField, filters.dateFrom);
        query = query.lte(dateField, filters.dateTo);
      }

      // Quick filters
      if (filters.quickFilter === 'needs_attention') {
        query = query.lte('health_score', 60);
      } else if (filters.quickFilter === 'top_performers') {
        query = query.gte('rating', 4.5);
        query = query.gte('health_score', 80);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'location_name';
      const sortOrder = filters.sortOrder || 'asc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (controller.signal.aborted) return;

      if (queryError) {
        throw queryError;
      }

      // Transform data to Location type
      const transformedLocations: Location[] = (data || []).map((loc: any) => ({
        id: loc.id,
        name: loc.location_name || 'Unnamed Location',
        address: loc.address || undefined,
        phone: loc.phone || undefined,
        website: loc.website || undefined,
        rating: loc.rating || 0,
        reviewCount: loc.review_count || 0,
        status: 'verified' as const,
        category: loc.category || undefined,
        coordinates: loc.latitude && loc.longitude ? {
          lat: loc.latitude,
          lng: loc.longitude
        } : undefined,
        healthScore: loc.health_score || 0,
        lastSync: loc.last_sync || null,
        insights: {
          views: 0,
          viewsTrend: 0,
          clicks: 0,
          clicksTrend: 0,
          calls: 0,
          callsTrend: 0,
          directions: 0,
          directionsTrend: 0,
          weeklyGrowth: 0,
        },
      }));

      if (reset) {
        setLocations(transformedLocations);
      } else {
        setLocations(prev => [...prev, ...transformedLocations]);
      }

      setTotal(count || 0);
      setHasMore((count || 0) > pageNum * pageSize);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        console.error('Error fetching locations:', err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [supabase, filters, pageSize]);

  const refetch = useCallback(async () => {
    await fetchLocations(1, true);
  }, [fetchLocations]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchLocations(nextPage, false);
    }
  }, [loading, hasMore, page, fetchLocations]);

  useEffect(() => {
    fetchLocations(1, true);
  }, [fetchLocations]);

  // ✅ REAL-TIME: Subscribe to location changes
  useEffect(() => {
    isMountedRef.current = true;
    let userId: string | null = null;

    const setupRealtime = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return;
        }

        userId = user.id;

        // Cleanup previous subscription
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        // Subscribe to location changes
        const channel = supabase
          .channel(`locations:${userId}:${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*', // INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'gmb_locations',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log('📡 Location changed:', payload.eventType, payload);
              
              if (!isMountedRef.current) return;

              // Refetch locations when changes occur
              fetchLocations(1, true).catch((err) => {
                if (err.name !== 'AbortError') {
                  console.error('Error refetching after realtime update:', err);
                }
              });
            }
          )
          .on('system', { event: 'error' }, (error) => {
            console.error('Realtime subscription error:', error);
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Locations realtime subscribed');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Locations realtime subscription error:', err);
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Error setting up realtime:', err);
      }
    };

    setupRealtime();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [supabase, fetchLocations]);

  return {
    locations,
    loading,
    error,
    total,
    refetch,
    hasMore,
    loadMore,
  };
}
