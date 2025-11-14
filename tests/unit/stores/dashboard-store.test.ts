import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '@/lib/stores/dashboard-store';

describe('Dashboard Store', () => {
  beforeEach(() => {
    // Reset store between tests
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetch).toBeNull();
      expect(result.current.isStale).toBe(true);
    });
  });

  describe('setStats', () => {
    it('should update stats and loading state', () => {
      const { result } = renderHook(() => useDashboardStore());
      const mockStats = {
        totalLocations: 10,
        totalReviews: 100,
        averageRating: 4.5,
        responseRate: 0.85,
        healthScore: 90,
      };

      act(() => {
        result.current.setStats(mockStats);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetch).toBeInstanceOf(Date);
      expect(result.current.isStale).toBe(false);
    });

    it('should clear error when setting stats', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Set error first
      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      // Set stats
      const mockStats = {
        totalLocations: 5,
        totalReviews: 50,
        averageRating: 4.0,
        responseRate: 0.7,
        healthScore: 85,
      };

      act(() => {
        result.current.setStats(mockStats);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should update error state and clear loading', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Set loading first
      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setError('Failed to fetch data');
      });

      expect(result.current.error).toBe('Failed to fetch data');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('isStale', () => {
    it('should return true when lastFetch is null', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.isStale).toBe(true);
    });

    it('should return true when data is older than 5 minutes', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Mock Date to control time
      const originalDateNow = Date.now;
      const mockNow = new Date('2024-01-01T12:00:00Z').getTime();
      Date.now = jest.fn(() => mockNow);

      // Set stats
      act(() => {
        result.current.setStats({
          totalLocations: 1,
          totalReviews: 10,
          averageRating: 5,
          responseRate: 1,
          healthScore: 100,
        });
      });

      expect(result.current.isStale).toBe(false);

      // Advance time by 6 minutes
      Date.now = jest.fn(() => mockNow + 6 * 60 * 1000);

      // Force re-render to recalculate isStale
      const { result: result2 } = renderHook(() => useDashboardStore());
      expect(result2.current.isStale).toBe(true);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should return false when data is fresh', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setStats({
          totalLocations: 1,
          totalReviews: 10,
          averageRating: 5,
          responseRate: 1,
          healthScore: 100,
        });
      });

      expect(result.current.isStale).toBe(false);
    });
  });

  describe('updateStat', () => {
    it('should update individual stat', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Set initial stats
      const initialStats = {
        totalLocations: 10,
        totalReviews: 100,
        averageRating: 4.5,
        responseRate: 0.85,
        healthScore: 90,
      };

      act(() => {
        result.current.setStats(initialStats);
      });

      // Update single stat
      act(() => {
        result.current.updateStat('totalReviews', 110);
      });

      expect(result.current.stats).toEqual({
        ...initialStats,
        totalReviews: 110,
      });
    });

    it('should not update if stats is null', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.updateStat('totalReviews', 100);
      });

      expect(result.current.stats).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Set some data
      act(() => {
        result.current.setStats({
          totalLocations: 5,
          totalReviews: 50,
          averageRating: 4.0,
          responseRate: 0.7,
          healthScore: 85,
        });
        result.current.setError('Some error');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetch).toBeNull();
      expect(result.current.isStale).toBe(true);
    });
  });

  describe('concurrent updates', () => {
    it('should handle rapid updates correctly', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setStats({
          totalLocations: 1,
          totalReviews: 10,
          averageRating: 5,
          responseRate: 1,
          healthScore: 100,
        });
        result.current.updateStat('totalReviews', 20);
        result.current.updateStat('totalLocations', 2);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.stats).toEqual({
        totalLocations: 2,
        totalReviews: 20,
        averageRating: 5,
        responseRate: 1,
        healthScore: 100,
      });
    });
  });

  describe('persistence across components', () => {
    it('should share state between multiple hook instances', () => {
      const { result: hook1 } = renderHook(() => useDashboardStore());
      const { result: hook2 } = renderHook(() => useDashboardStore());

      // Update from first hook
      act(() => {
        hook1.current.setStats({
          totalLocations: 3,
          totalReviews: 30,
          averageRating: 4.2,
          responseRate: 0.8,
          healthScore: 88,
        });
      });

      // Both hooks should have same state
      expect(hook1.current.stats).toEqual(hook2.current.stats);
      expect(hook1.current.lastFetch).toEqual(hook2.current.lastFetch);
    });
  });
});
