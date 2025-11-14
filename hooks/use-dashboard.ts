import { useDashboardStore } from '@/lib/stores/dashboard-store';
import { useReviewsStore } from '@/lib/stores/reviews-store';
import { useQuestionsStore } from '@/lib/stores/questions-store';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Hook to access dashboard data and actions from centralized store
 */
export function useDashboard() {
  // Use shallow comparison to prevent unnecessary re-renders
  const dashboardState = useDashboardStore(
    useShallow((state) => ({
      stats: state.stats,
      statsLoading: state.statsLoading,
      statsError: state.statsError,
      activeLocation: state.activeLocation,
      locations: state.locations,
      locationsLoading: state.locationsLoading,
      isSyncing: state.isSyncing,
      lastSyncTime: state.lastSyncTime,
      // Actions
      setActiveLocation: state.setActiveLocation,
      fetchDashboardStats: state.fetchDashboardStats,
      fetchLocations: state.fetchLocations,
      setSyncStatus: state.setSyncStatus,
      refreshAll: state.refreshAll,
    }))
  );

  // Auto-refresh stats if they're stale (older than 5 minutes)
  useEffect(() => {
    const lastUpdate = useDashboardStore.getState().lastStatsUpdate;
    if (!lastUpdate || Date.now() - lastUpdate.getTime() > 5 * 60 * 1000) {
      dashboardState.fetchDashboardStats();
    }
  }, []);

  return dashboardState;
}

/**
 * Hook to access pending counts across reviews and questions
 */
export function usePendingCounts() {
  const reviewsPending = useReviewsStore((state) => 
    state.reviews.filter(r => !r.has_reply).length
  );
  
  const questionsPending = useQuestionsStore((state) =>
    state.questions.filter(q => q.answer_status === 'unanswered' || q.answer_status === 'pending').length
  );

  const dashboardPending = useDashboardStore(
    useShallow((state) => ({
      reviews: state.stats.pendingReviews,
      questions: state.stats.pendingQuestions,
    }))
  );

  // Use the most up-to-date counts
  return {
    pendingReviews: reviewsPending || dashboardPending.reviews,
    pendingQuestions: questionsPending || dashboardPending.questions,
    totalPending: (reviewsPending || dashboardPending.reviews) + (questionsPending || dashboardPending.questions),
  };
}

/**
 * Hook to access and manage active location
 */
export function useActiveLocation() {
  const { activeLocation, setActiveLocation, locations } = useDashboardStore(
    useShallow((state) => ({
      activeLocation: state.activeLocation,
      setActiveLocation: state.setActiveLocation,
      locations: state.locations,
    }))
  );

  // Function to set active location by ID
  const setActiveLocationById = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (location) {
      setActiveLocation(location);
    }
  };

  // Function to clear active location
  const clearActiveLocation = () => {
    setActiveLocation(null);
  };

  return {
    activeLocation,
    setActiveLocation,
    setActiveLocationById,
    clearActiveLocation,
    hasActiveLocation: !!activeLocation,
  };
}

/**
 * Hook to get aggregated statistics
 */
export function useAggregatedStats() {
  const dashboardStats = useDashboardStore((state) => state.stats);
  const reviewStats = useReviewsStore((state) => state.stats);
  const questionStats = useQuestionsStore((state) => state.stats);

  return {
    // Locations
    totalLocations: dashboardStats.totalLocations,
    averageRating: dashboardStats.averageRating,
    overallHealthScore: dashboardStats.healthScore,
    
    // Reviews
    totalReviews: reviewStats.total || dashboardStats.totalReviews,
    pendingReviews: reviewStats.pending || dashboardStats.pendingReviews,
    responseRate: reviewStats.responseRate || dashboardStats.responseRate,
    sentimentBreakdown: reviewStats.sentimentBreakdown,
    
    // Questions
    totalQuestions: questionStats.total || dashboardStats.totalQuestions,
    answeredQuestions: questionStats.answered,
    unansweredQuestions: questionStats.unanswered || dashboardStats.pendingQuestions,
    answerRate: questionStats.answerRate,
    
    // Combined
    totalEngagements: (reviewStats.total || dashboardStats.totalReviews) + 
                     (questionStats.total || dashboardStats.totalQuestions),
    pendingActions: (reviewStats.pending || dashboardStats.pendingReviews) + 
                    (questionStats.unanswered || dashboardStats.pendingQuestions),
  };
}

/**
 * Hook for sync operations across stores
 */
export function useSyncOperations() {
  const { setSyncStatus, isSyncing } = useDashboardStore(
    useShallow((state) => ({
      setSyncStatus: state.setSyncStatus,
      isSyncing: state.isSyncing,
    }))
  );

  const syncAllData = async () => {
    if (isSyncing) return;
    
    setSyncStatus(true);
    
    try {
      // Trigger sync via API
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'full' }),
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      // Refresh all stores after sync
      await Promise.all([
        useDashboardStore.getState().refreshAll(),
        useReviewsStore.getState().fetchReviews(),
        useReviewsStore.getState().fetchReviewStats(),
        useQuestionsStore.getState().fetchQuestions(),
        useQuestionsStore.getState().fetchQuestionStats(),
      ]);
      
      setSyncStatus(false);
    } catch (error) {
      setSyncStatus(false, error as Error);
      throw error;
    }
  };

  return {
    syncAllData,
    isSyncing,
  };
}
