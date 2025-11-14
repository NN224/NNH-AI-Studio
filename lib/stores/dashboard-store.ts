import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { GMBLocation } from '@/lib/types/database';

/**
 * Dashboard state type definitions
 */
interface DashboardStats {
  totalLocations: number;
  totalReviews: number;
  totalQuestions: number;
  pendingReviews: number;
  pendingQuestions: number;
  averageRating: number;
  responseRate: number;
  healthScore: number;
}

interface DashboardState {
  // Current user data
  userId: string | null;
  
  // Dashboard statistics
  stats: DashboardStats;
  statsLoading: boolean;
  statsError: Error | null;
  lastStatsUpdate: Date | null;
  
  // Active location
  activeLocation: GMBLocation | null;
  
  // Locations data
  locations: GMBLocation[];
  locationsLoading: boolean;
  locationsError: Error | null;
  
  // Reviews count (for notifications)
  pendingReviewsCount: number;
  
  // Questions count (for notifications)
  pendingQuestionsCount: number;
  
  // Sync status
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: Error | null;
  
  // Actions
  setUserId: (userId: string | null) => void;
  setStats: (stats: Partial<DashboardStats>) => void;
  setStatsLoading: (loading: boolean) => void;
  setStatsError: (error: Error | null) => void;
  setActiveLocation: (location: GMBLocation | null) => void;
  setLocations: (locations: GMBLocation[]) => void;
  setLocationsLoading: (loading: boolean) => void;
  setLocationsError: (error: Error | null) => void;
  setPendingCounts: (reviews: number, questions: number) => void;
  setSyncStatus: (syncing: boolean, error?: Error | null) => void;
  updateLocation: (locationId: string, updates: Partial<GMBLocation>) => void;
  
  // Computed values
  getLocationById: (id: string) => GMBLocation | undefined;
  getTotalPendingItems: () => number;
  
  // Fetch functions
  fetchDashboardStats: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Dashboard store implementation
 */
export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          userId: null,
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
          statsLoading: false,
          statsError: null,
          lastStatsUpdate: null,
          activeLocation: null,
          locations: [],
          locationsLoading: false,
          locationsError: null,
          pendingReviewsCount: 0,
          pendingQuestionsCount: 0,
          isSyncing: false,
          lastSyncTime: null,
          syncError: null,
          
          // Actions
          setUserId: (userId) =>
            set((state) => {
              state.userId = userId;
            }),
            
          setStats: (stats) =>
            set((state) => {
              Object.assign(state.stats, stats);
              state.lastStatsUpdate = new Date();
            }),
            
          setStatsLoading: (loading) =>
            set((state) => {
              state.statsLoading = loading;
            }),
            
          setStatsError: (error) =>
            set((state) => {
              state.statsError = error;
            }),
            
          setActiveLocation: (location) =>
            set((state) => {
              state.activeLocation = location;
            }),
            
          setLocations: (locations) =>
            set((state) => {
              state.locations = locations;
            }),
            
          setLocationsLoading: (loading) =>
            set((state) => {
              state.locationsLoading = loading;
            }),
            
          setLocationsError: (error) =>
            set((state) => {
              state.locationsError = error;
            }),
            
          setPendingCounts: (reviews, questions) =>
            set((state) => {
              state.pendingReviewsCount = reviews;
              state.pendingQuestionsCount = questions;
              state.stats.pendingReviews = reviews;
              state.stats.pendingQuestions = questions;
            }),
            
          setSyncStatus: (syncing, error = null) =>
            set((state) => {
              state.isSyncing = syncing;
              if (!syncing) {
                state.lastSyncTime = new Date();
              }
              if (error !== undefined) {
                state.syncError = error;
              }
            }),
            
          updateLocation: (locationId, updates) =>
            set((state) => {
              const index = state.locations.findIndex((l) => l.id === locationId);
              if (index !== -1) {
                Object.assign(state.locations[index], updates);
              }
              if (state.activeLocation?.id === locationId) {
                Object.assign(state.activeLocation, updates);
              }
            }),
            
          // Computed values
          getLocationById: (id) => {
            return get().locations.find((l) => l.id === id);
          },
          
          getTotalPendingItems: () => {
            const state = get();
            return state.pendingReviewsCount + state.pendingQuestionsCount;
          },
          
          // Fetch functions
          fetchDashboardStats: async () => {
            const state = get();
            if (!state.userId) return;
            
            set((state) => {
              state.statsLoading = true;
              state.statsError = null;
            });
            
            try {
              const response = await fetch('/api/dashboard/stats');
              if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
              }
              
              const data = await response.json();
              
              set((state) => {
                state.stats = {
                  totalLocations: data.totalLocations || 0,
                  totalReviews: data.totalReviews || 0,
                  totalQuestions: data.totalQuestions || 0,
                  pendingReviews: data.pendingReviews || 0,
                  pendingQuestions: data.pendingQuestions || 0,
                  averageRating: data.averageRating || 0,
                  responseRate: data.responseRate || 0,
                  healthScore: data.healthScore || 0,
                };
                state.statsLoading = false;
                state.lastStatsUpdate = new Date();
              });
            } catch (error) {
              set((state) => {
                state.statsError = error instanceof Error ? error : new Error('Unknown error');
                state.statsLoading = false;
              });
            }
          },
          
          fetchLocations: async () => {
            const state = get();
            if (!state.userId) return;
            
            set((state) => {
              state.locationsLoading = true;
              state.locationsError = null;
            });
            
            try {
              const response = await fetch('/api/locations?limit=100');
              if (!response.ok) {
                throw new Error('Failed to fetch locations');
              }
              
              const data = await response.json();
              
              set((state) => {
                state.locations = data.locations || [];
                state.locationsLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.locationsError = error instanceof Error ? error : new Error('Unknown error');
                state.locationsLoading = false;
              });
            }
          },
          
          refreshAll: async () => {
            await Promise.all([
              get().fetchDashboardStats(),
              get().fetchLocations(),
            ]);
          },
        }))
      ),
      {
        name: 'dashboard-store',
        partialize: (state) => ({
          activeLocation: state.activeLocation,
          lastSyncTime: state.lastSyncTime,
        }),
      }
    ),
    {
      name: 'DashboardStore',
    }
  )
);

/**
 * Selectors for common use cases
 */
export const selectStats = (state: DashboardState) => state.stats;
export const selectActiveLocation = (state: DashboardState) => state.activeLocation;
export const selectPendingCounts = (state: DashboardState) => ({
  reviews: state.pendingReviewsCount,
  questions: state.pendingQuestionsCount,
  total: state.pendingReviewsCount + state.pendingQuestionsCount,
});
export const selectSyncStatus = (state: DashboardState) => ({
  isSyncing: state.isSyncing,
  lastSyncTime: state.lastSyncTime,
  error: state.syncError,
});
