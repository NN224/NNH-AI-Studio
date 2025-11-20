import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { GMBQuestion } from '@/lib/types/database';
import { apiClient } from '@/lib/utils/api-client';

interface QuestionsCache {
  questions: GMBQuestion[];
  totalCount: number;
  lastUpdated: string;
  filters: Record<string, any>;
}

interface QuestionsQueryKey {
  type: 'questions';
  filters: Record<string, any>;
}

// Cache expiry times
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

export function useQuestionsCache(filters: Record<string, any> = {}) {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Query key factory
  const queryKey: QuestionsQueryKey = {
    type: 'questions',
    filters
  };

  // Fetch questions with caching
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/questions?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'max-age=300', // Browser cache for 5 mins
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      
      return {
        questions: data.questions || [],
        totalCount: data.totalCount || 0,
        lastUpdated: new Date().toISOString(),
        filters
      } as QuestionsCache;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TTL,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
  });

  // Optimistic update for question answers
  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      return apiClient.post(`/api/questions/${questionId}/answer`, { answer });
    },
    onMutate: async ({ questionId, answer }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: [queryKey] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<QuestionsCache>([queryKey]);

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<QuestionsCache>([queryKey], {
          ...previousData,
          questions: previousData.questions.map(q => 
            q.id === questionId 
              ? { ...q, answer_text: answer, answer_status: 'answered', answered_at: new Date().toISOString() }
              : q
          )
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData([queryKey], context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  });

  // Batch prefetch for pagination
  const prefetchNextPage = useCallback(async (nextPage: number) => {
    const nextFilters = { ...filters, page: nextPage };
    const nextQueryKey = { type: 'questions' as const, filters: nextFilters };

    await queryClient.prefetchQuery({
      queryKey: [nextQueryKey],
      queryFn: async () => {
        const params = new URLSearchParams();
        Object.entries(nextFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && String(value) !== '' && String(value) !== '0') {
            params.append(key, String(value));
          }
        });

        const response = await fetch(`/api/questions?${params}`);
        if (!response.ok) throw new Error('Failed to prefetch');
        
        return response.json();
      },
      staleTime: STALE_TIME
    });
  }, [filters, queryClient]);

  // Invalidate related caches
  const invalidateRelatedCaches = useCallback(() => {
    // Invalidate all question queries
    queryClient.invalidateQueries({ queryKey: [{ type: 'questions' }] });
    
    // Also invalidate dashboard stats
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  }, [queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    questions: data?.questions || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    refetch,
    answerQuestion: answerMutation.mutate,
    isAnswering: answerMutation.isPending,
    prefetchNextPage,
    invalidateRelatedCaches
  };
}

// Utility to prefetch questions in background
export async function prefetchQuestions(
  queryClient: any,
  filters: Record<string, any> = {}
) {
  const queryKey = { type: 'questions' as const, filters };
  
  return queryClient.prefetchQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error('Failed to prefetch questions');
      
      return response.json();
    },
    staleTime: STALE_TIME
  });
}
