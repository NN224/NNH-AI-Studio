'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import { createClient } from '@/lib/supabase/client';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * Store provider that initializes and syncs stores with user session
 */
export function StoreProvider({ children }: StoreProviderProps) {
  const setUserId = useDashboardStore((state) => state.setUserId);
  const supabase = createClient();

  useEffect(() => {
    // Initialize user session
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Initial data fetch
        useDashboardStore.getState().fetchDashboardStats();
        useDashboardStore.getState().fetchLocations();
      }
    };

    initializeUser();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        useDashboardStore.getState().refreshAll();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        // Clear stores on sign out
        useDashboardStore.setState({
          stats: {
            totalLocations: 0,
            totalReviews: 0,
            totalQuestions: 0,
            pendingReviews: 0,
            pendingQuestions: 0,
            averageRating: 0,
            responseRate: 0,
            healthScore: 0,
          },
          locations: [],
          activeLocation: null,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setUserId]);

  // Subscribe to cross-tab events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard-store') {
        // Sync state changes across tabs
        useDashboardStore.getState().refreshAll();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen for custom events
  useEffect(() => {
    const handleDashboardRefresh = () => {
      useDashboardStore.getState().refreshAll();
    };

    const handleLocationUpdate = (e: CustomEvent) => {
      const { locationId, updates } = e.detail;
      if (locationId && updates) {
        useDashboardStore.getState().updateLocation(locationId, updates);
      }
    };

    window.addEventListener('dashboard:refresh', handleDashboardRefresh);
    window.addEventListener('location:update', handleLocationUpdate as EventListener);

    return () => {
      window.removeEventListener('dashboard:refresh', handleDashboardRefresh);
      window.removeEventListener('location:update', handleLocationUpdate as EventListener);
    };
  }, []);

  return <>{children}</>;
}

/**
 * Hook to sync store state with external data
 */
export function useStoreSync() {
  const { fetchDashboardStats, fetchLocations } = useDashboardStore();

  const syncAll = async () => {
    await Promise.all([
      fetchDashboardStats(),
      fetchLocations(),
    ]);
  };

  return { syncAll };
}
