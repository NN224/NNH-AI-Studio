'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  
  // Memoize filters to prevent infinite loops from object reference changes
  const filtersRef = useRef(filters);
  const filtersString = JSON.stringify(filters);
  
  // Update filters ref only when filters actually change
  useEffect(() => {
    const currentFiltersString = JSON.stringify(filtersRef.current);
    if (currentFiltersString !== filtersString) {
      filtersRef.current = filters;
    }
  }, [filtersString]);

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

      // Use filters from ref to avoid dependency issues
      const currentFilters = filtersRef.current;

      console.log('🔄 [useLocations] Starting fetch...', { pageNum, reset, timestamp: new Date().toISOString() });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ [useLocations] Auth error:', authError);
        throw new Error('Authentication required. Please sign in again.');
      }

      console.log('✅ [useLocations] User authenticated:', { userId: user.id });

      // Build query
      let query = supabase
        .from('gmb_locations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Apply filters (using currentFilters from ref)
      if (currentFilters.search) {
        const sanitizedSearch = currentFilters.search.trim().slice(0, 100).replace(/%/g, '\\%').replace(/_/g, '\\_');
        if (sanitizedSearch) {
          query = query.or(`location_name.ilike.%${sanitizedSearch}%,address.ilike.%${sanitizedSearch}%`);
        }
      }

      if (currentFilters.category && currentFilters.category !== 'all') {
        query = query.eq('category', currentFilters.category);
      }

      if (currentFilters.status && currentFilters.status !== 'all') {
        query = query.eq('status', currentFilters.status);
      }

      // Rating range filter
      if (currentFilters.ratingMin !== undefined) {
        query = query.gte('rating', currentFilters.ratingMin);
      }
      if (currentFilters.ratingMax !== undefined) {
        query = query.lte('rating', currentFilters.ratingMax);
      }

      // Health score range filter
      if (currentFilters.healthScoreMin !== undefined) {
        query = query.gte('health_score', currentFilters.healthScoreMin);
      }
      if (currentFilters.healthScoreMax !== undefined) {
        query = query.lte('health_score', currentFilters.healthScoreMax);
      }

      // Review count range filter
      if (currentFilters.reviewCountMin !== undefined) {
        query = query.gte('review_count', currentFilters.reviewCountMin);
      }
      if (currentFilters.reviewCountMax !== undefined) {
        query = query.lte('review_count', currentFilters.reviewCountMax);
      }

      // Date range filter
      if (currentFilters.dateRange && currentFilters.dateFrom && currentFilters.dateTo) {
        const dateField = currentFilters.dateRange === 'last_sync' ? 'updated_at' : 'created_at';
        query = query.gte(dateField, currentFilters.dateFrom);
        query = query.lte(dateField, currentFilters.dateTo);
      }

      // Quick filters
      if (currentFilters.quickFilter === 'needs_attention') {
        query = query.lte('health_score', 60);
      } else if (currentFilters.quickFilter === 'top_performers') {
        query = query.gte('rating', 4.5);
        query = query.gte('health_score', 80);
      }

      // Apply sorting
      const sortBy = currentFilters.sortBy || 'location_name';
      const sortOrder = currentFilters.sortOrder || 'asc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      console.log('📊 [useLocations] Executing query...', { 
        filters: Object.keys(currentFilters).length,
        pageNum,
        pageSize 
      });

      const { data, error: queryError, count } = await query;

      if (controller.signal.aborted) {
        console.log('⏹️ [useLocations] Request aborted');
        return;
      }

      if (queryError) {
        console.error('❌ [useLocations] Query error:', {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint
        });
        throw queryError;
      }

      console.log('✅ [useLocations] Query successful:', { 
        count: data?.length || 0, 
        total: count || 0 
      });

      // Transform data to Location type (skip records without valid IDs)
      const transformedLocations: Location[] = (data || [])
        .filter((loc: any) => loc?.id && String(loc.id).trim() !== '')
        .map((loc: any) => ({
        id: loc.id,
        name: loc.location_name || 'Unnamed Location',
        address: loc.address || undefined,
        phone: loc.phone || undefined,
        website: loc.website || undefined,
        // Preserve actual values - only default to 0 if truly null/undefined
        rating: loc.rating != null ? loc.rating : undefined,
        reviewCount: loc.review_count != null ? loc.review_count : undefined,
        status: 'verified' as const,
        category: loc.category || undefined,
        coordinates: loc.latitude && loc.longitude ? {
          lat: loc.latitude,
          lng: loc.longitude
        } : undefined,
        // Preserve actual health_score value
        healthScore: loc.health_score != null ? loc.health_score : undefined,
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
      
      console.log('✅ [useLocations] Locations set:', { 
        locationsCount: transformedLocations.length,
        total,
        hasMore 
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'Unknown error occurred';
        const errorName = err.name || 'Error';
        
        console.error('❌ [useLocations] Fetch error:', {
          name: errorName,
          message: errorMessage,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        
        setError(err);
      } else if (err instanceof Error && err.name === 'AbortError') {
        console.log('⏹️ [useLocations] Request aborted (expected)');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        console.log('🏁 [useLocations] Loading complete');
      }
    }
  }, [supabase, pageSize]); // Removed filters from dependencies - using ref instead

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

  // Only fetch on mount and when filters actually change (by string comparison)
  const filtersStringRef = useRef<string>('');
  const hasFetchedRef = useRef(false);
  const fetchLocationsRef = useRef(fetchLocations);
  
  // Update fetchLocations ref when it changes
  useEffect(() => {
    fetchLocationsRef.current = fetchLocations;
  }, [fetchLocations]);
  
  useEffect(() => {
    const currentFiltersString = JSON.stringify(filtersRef.current);
    
    // Only fetch if filters actually changed AND we haven't already fetched with these filters
    if (filtersStringRef.current !== currentFiltersString || !hasFetchedRef.current) {
      filtersStringRef.current = currentFiltersString;
      hasFetchedRef.current = true;
      // Use ref to avoid dependency on fetchLocations
      fetchLocationsRef.current(1, true);
    }
  }, [filtersString]); // Only depend on filtersString

  // ✅ REAL-TIME: Subscribe to location changes
  // fetchLocationsRef is already defined above

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

              // Refetch locations when changes occur - use ref to avoid dependency
              fetchLocationsRef.current(1, true).catch((err) => {
                if (err.name !== 'AbortError') {
                  console.error('Error refetching after realtime update:', err);
                }
              });
            }
          )
          .on('system', { event: 'error' }, (error) => {
            // Check if this is actually an error or just a status message
            const errorStatus = error?.status || '';
            const errorMessage = error?.message || '';
            const errorString = JSON.stringify(error);
            
            // Ignore success messages that are logged as errors
            if (errorStatus === 'ok' || 
                errorMessage.includes('Subscribed to PostgreSQL') ||
                errorString.includes('Subscribed to PostgreSQL')) {
              // This is actually a success message, not an error
              return;
            }
            
            // Check if it's a Realtime configuration error
            if (errorMessage.includes('Realtime is enabled') || 
                errorMessage.includes('Unable to subscribe') ||
                errorString.includes('Realtime is enabled')) {
              console.warn('⚠️ Realtime may not be enabled for gmb_locations table. Continuing without real-time updates.');
              return; // Don't log as error
            }
            
            // Only log actual errors that are not configuration issues
            console.error('Realtime subscription error:', error);
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Locations realtime subscribed');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Locations realtime subscription error:', err);
              
              // Log detailed error for debugging
              if (err) {
                const errorMessage = err?.message || JSON.stringify(err);
                if (errorMessage.includes('Realtime is enabled') || 
                    errorMessage.includes('Unable to subscribe')) {
                  console.warn('⚠️ Realtime subscription failed - Realtime may not be enabled for gmb_locations table in Supabase. The app will continue to work, but without real-time updates.');
                }
              }
            } else if (status === 'TIMED_OUT') {
              console.warn('⏱️ Locations realtime subscription timed out');
            } else if (status === 'CLOSED') {
              console.log('🔌 Locations realtime subscription closed');
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
  }, [supabase]); // Removed fetchLocations from dependencies - using ref instead

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
