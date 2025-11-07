'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGMBConnectionStatus } from '@/server/actions/gmb-account';

export function useGMBConnection() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['gmb-connection-status'],
    queryFn: async () => {
      const result = await getGMBConnectionStatus();
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const clearCache = (accountId?: string) => {
    // Clear React Query cache
    queryClient.removeQueries({ queryKey: ['gmb-connection-status'] });
    if (accountId) {
      queryClient.removeQueries({ queryKey: ['gmb', accountId] });
    }
    
    // Clear localStorage GMB-related data
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('gmb_cache_') || key.startsWith('gmb_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
    }
  };

  return {
    isConnected: data?.isConnected || false,
    activeAccounts: data?.activeAccounts || [],
    disconnectedAccounts: data?.disconnectedAccounts || [],
    hasArchivedData: data?.hasArchivedData || false,
    archivedLocationsCount: data?.archivedLocationsCount || 0,
    archivedReviewsCount: data?.archivedReviewsCount || 0,
    isLoading,
    error,
    clearCache,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['gmb-connection-status'] }),
  };
}
