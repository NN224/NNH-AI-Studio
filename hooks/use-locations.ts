'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Location } from '@/components/locations/location-types';
import { mapLocationCoordinates } from '@/lib/utils/location-coordinates';
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

function normalizeLocationStatus(status: unknown): Location['status'] {
  const value = (status ?? '').toString().toLowerCase();
  if (value.includes('suspend')) return 'suspended';
  if (value.includes('verify') || value.includes('active') || value.includes('published')) {
    return 'verified';
  }
  return 'pending';
}

function coerceNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

const coerceString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
};

function parseMetadata(metadata: unknown): Record<string, any> {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata as Record<string, any>;
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, any>;
      }
    } catch (error) {
      console.warn('[useLocations] Failed to parse metadata JSON', { metadata, error });
    }
  }
  return {};
}

function extractImageFromMetadata(
  metadata: Record<string, any>,
  preferredKeys: string[]
): string | undefined {
  for (const key of preferredKeys) {
    const segments = key.split('.');
    let value: any = metadata;
    for (const segment of segments) {
      if (value == null) break;
      value = value?.[segment];
    }

    const url =
      typeof value === 'string'
        ? value
        : typeof value === 'object' && value !== null
        ? (value.url as string | undefined) ??
          (value.src as string | undefined) ??
          (value.value as string | undefined)
        : undefined;
    const parsed = coerceString(url);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function extractFirstMediaUrl(metadata: Record<string, any>): string | undefined {
  const mediaCollections = [
    metadata.mediaItems,
    metadata.media,
    metadata.photos,
    metadata.gallery,
    metadata.images,
  ];

  for (const collection of mediaCollections) {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        const candidate =
          coerceString(item?.coverUrl) ??
          coerceString(item?.cover_photo_url) ??
          coerceString(item?.photoUrl) ??
          coerceString(item?.url) ??
          coerceString(item?.thumbnailUrl) ??
          coerceString(item?.imageUrl);
        if (candidate) {
          return candidate;
        }
      }
    }
  }
  return undefined;
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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[useLocations] profiles lookup error:', profileError);
    }

    const fallbackLogoUrl = coerceString(profileData?.avatar_url);
    const fallbackCoverUrl = undefined;

      // Build query
      let query = supabase
        .from('gmb_locations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

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
        if (currentFilters.status === 'active') {
          query = query.eq('is_active', true);
        } else if (currentFilters.status === 'inactive') {
          query = query.eq('is_active', false);
        }
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

      const locationIds: string[] =
        data?.map((loc: any) => (loc?.id ? String(loc.id) : null)).filter((id): id is string => Boolean(id)) ?? [];

      const pendingReviewsMap = new Map<string, number>();
      const pendingQuestionsMap = new Map<string, number>();

      if (locationIds.length > 0) {
        const [pendingReviewsResult, pendingQuestionsResult] = await Promise.all([
          supabase
            .from('gmb_reviews')
            .select('location_id, has_reply')
            .eq('user_id', user.id)
            .in('location_id', locationIds)
            .or('has_reply.eq.false,has_reply.is.null'),
          supabase
            .from('gmb_questions')
            .select('location_id, answer_status')
            .eq('user_id', user.id)
            .in('location_id', locationIds)
            .in('answer_status', ['pending', 'unanswered']),
        ]);

        if (pendingReviewsResult.error) {
          console.warn('[useLocations] pending reviews lookup failed:', pendingReviewsResult.error);
        } else {
          for (const review of pendingReviewsResult.data ?? []) {
            const locationId = review?.location_id;
            if (!locationId) continue;
            pendingReviewsMap.set(locationId, (pendingReviewsMap.get(locationId) ?? 0) + 1);
          }
        }

        if (pendingQuestionsResult.error) {
          console.warn('[useLocations] pending questions lookup failed:', pendingQuestionsResult.error);
        } else {
          for (const question of pendingQuestionsResult.data ?? []) {
            const locationId = question?.location_id;
            if (!locationId) continue;
            pendingQuestionsMap.set(locationId, (pendingQuestionsMap.get(locationId) ?? 0) + 1);
          }
        }
      }

      // Transform data to Location type (skip records without valid IDs)
      const transformedLocations: Location[] = (data || [])
        .filter((loc: any) => loc?.id && String(loc.id).trim() !== '')
        .map((loc: any) => {
          const metadata = parseMetadata(loc.metadata);
          const profile = parseMetadata(metadata.profile);

          const rating =
            coerceNumber(loc.rating) ?? coerceNumber(metadata.rating);

          const reviewCount =
            coerceNumber(loc.review_count) ??
            coerceNumber(metadata.reviewCount) ??
            0;

          const healthScore =
            coerceNumber(loc.health_score) ??
            coerceNumber(metadata.healthScore) ??
            coerceNumber(metadata.health_score);

          const coordinates = mapLocationCoordinates(loc);

          const rawInsights =
            (metadata.insights_json ||
              metadata.insights ||
              {}) as Record<string, unknown>;

          const insights = {
            views: coerceNumber(rawInsights.views) ?? 0,
            viewsTrend: coerceNumber(rawInsights.viewsTrend) ?? 0,
            clicks: coerceNumber(rawInsights.clicks) ?? 0,
            clicksTrend: coerceNumber(rawInsights.clicksTrend) ?? 0,
            calls: coerceNumber(rawInsights.calls) ?? 0,
            callsTrend: coerceNumber(rawInsights.callsTrend) ?? 0,
            directions: coerceNumber(rawInsights.directions) ?? 0,
            directionsTrend: coerceNumber(rawInsights.directionsTrend) ?? 0,
            weeklyGrowth: coerceNumber(rawInsights.weeklyGrowth) ?? 0,
            pendingReviews: coerceNumber(rawInsights.pendingReviews),
            responseRate: coerceNumber(rawInsights.responseRate),
          };

          const photos =
            coerceNumber(metadata.mediaCount) ??
            coerceNumber(metadata.photos) ??
            undefined;

          const posts =
            coerceNumber(metadata.postsCount) ??
            coerceNumber(metadata.posts) ??
            undefined;

          const rawAttributes =
            Array.isArray(metadata.serviceItems) && metadata.serviceItems.length > 0
              ? metadata.serviceItems
              : Array.isArray(metadata.attributes)
              ? metadata.attributes
              : [];

          const attributes = Array.isArray(rawAttributes)
            ? rawAttributes
                .map((item: any) => {
                  if (typeof item === 'string') {
                    return item;
                  }
                  if (item && typeof item === 'object') {
                    return (
                      item.name ??
                      item.label ??
                      item.value ??
                      item.description ??
                      null
                    );
                  }
                  return null;
                })
                .filter((value): value is string => Boolean(value))
            : [];

          const pendingReviewsCount =
            pendingReviewsMap.get(loc.id) ??
            coerceNumber(loc.pending_reviews) ??
            coerceNumber(metadata.pendingReviews) ??
            coerceNumber(metadata.pending_review_count) ??
            insights.pendingReviews ?? 0;

          const pendingQuestionsCount =
            pendingQuestionsMap.get(loc.id) ??
            coerceNumber(loc.pending_questions) ??
            coerceNumber(metadata.pendingQuestions) ??
            coerceNumber(metadata.pending_question_count) ??
            coerceNumber(metadata.unansweredQuestions) ?? 0;

          const responseRate =
            coerceNumber(loc.response_rate) ??
            coerceNumber(metadata.responseRate) ??
            coerceNumber(metadata.response_rate) ??
            insights.responseRate;

          const ratingTrend =
            coerceNumber(metadata.ratingTrend) ??
            coerceNumber(metadata.rating_trend);

          const lastSync =
            loc.last_sync ||
            metadata.last_sync ||
            metadata.lastSync ||
            metadata.lastSyncedAt ||
            loc.updated_at ||
            null;

          const logoCandidates = [
            'logoImageUrl',
            'logo_image_url',
            'logoUrl',
            'logo.url',
            'logo.src',
            'logo.value',
            'branding.logoUrl',
            'branding.logo.url',
            'branding.logo.src',
            'brandLogo',
            'brand_logo',
            'profile.logoUrl',
            'profile.logo_url',
            'profile.logo.url',
            'profile.logo.src',
            'profile.logoImageUrl',
            'profile.branding.logoUrl',
            'customBranding.logoImageUrl',
            'customBranding.logoUrl',
            'customBranding.logo.url',
            'customBranding.logo_src',
          ];

          const coverCandidates = [
            'coverImageUrl',
            'cover_image_url',
            'coverPhotoUrl',
            'cover_photo_url',
            'coverPhoto',
            'cover_photo',
            'coverPhoto.url',
            'coverPhoto.src',
            'cover.url',
            'cover.src',
            'profile.coverPhotoUrl',
            'profile.cover_photo_url',
            'profile.coverPhoto.url',
            'profile.coverPhoto.src',
            'profile.cover.url',
            'profile.cover.src',
            'branding.coverImageUrl',
            'branding.cover_url',
            'branding.cover.url',
            'branding.cover.src',
            'branding.heroImageUrl',
            'branding.hero_image_url',
            'branding.hero.url',
            'branding.hero.src',
            'customBranding.coverImageUrl',
            'customBranding.coverUrl',
            'customBranding.cover.url',
            'customBranding.cover_src',
          ];

          const logoImageUrl =
            coerceString(loc.logo_image_url ?? loc.logoImageUrl) ??
            extractImageFromMetadata(metadata, logoCandidates) ??
            extractFirstMediaUrl(metadata) ??
            fallbackLogoUrl;

          const coverImageUrl =
            coerceString(loc.cover_photo_url ?? loc.cover_image_url ?? loc.coverImageUrl) ??
            extractImageFromMetadata(metadata, coverCandidates) ??
            extractFirstMediaUrl(metadata) ??
            fallbackCoverUrl;

          const isActive =
            typeof loc.is_active === 'boolean'
              ? loc.is_active
              : metadata.is_active !== false;

          const hasIssues = (pendingReviewsCount ?? 0) > 0 || (pendingQuestionsCount ?? 0) > 0;

          const lastReviewAt =
            loc.last_review_at ||
            metadata.lastReviewAt ||
            metadata.reviews?.lastReviewAt ||
            null;

          return {
        id: loc.id,
        name: loc.location_name || 'Unnamed Location',
        address: loc.address || undefined,
        phone: loc.phone || undefined,
        website: loc.website || undefined,
            rating,
            reviewCount,
            status: normalizeLocationStatus(loc.status),
            isActive,
            hasIssues,
            pendingReviews: pendingReviewsCount ?? 0,
            pendingQuestions: pendingQuestionsCount ?? 0,
            lastReviewAt,
        category: loc.category || undefined,
            coordinates,
            healthScore: healthScore ?? undefined,
            photos,
            posts,
            visibility: coerceNumber(metadata.visibilityScore) ?? undefined,
            lastSync,
            insights,
            responseRate: responseRate ?? undefined,
            ratingTrend: ratingTrend ?? undefined,
            metadata,
            attributes,
            autoReplyEnabled:
              typeof metadata.autoReplyEnabled === 'boolean'
                ? metadata.autoReplyEnabled
                : undefined,
            qnaEnabled:
              typeof metadata.qnaEnabled === 'boolean'
                ? metadata.qnaEnabled
                : undefined,
            profileProtection:
              typeof metadata.profileProtection === 'boolean'
                ? metadata.profileProtection
                : undefined,
            coverImageUrl: coverImageUrl ?? fallbackCoverUrl ?? null,
            logoImageUrl: logoImageUrl ?? fallbackLogoUrl ?? null,
          };
        });

      let finalLocations = transformedLocations;

      if (currentFilters.status === 'needs_attention') {
        finalLocations = transformedLocations.filter((location) => location.hasIssues);
      }

      if (reset) {
        setLocations(finalLocations);
      } else {
        setLocations(prev => [...prev, ...finalLocations]);
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
