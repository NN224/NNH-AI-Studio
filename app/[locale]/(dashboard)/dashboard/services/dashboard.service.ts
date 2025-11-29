// Dashboard Service - Handles all dashboard data operations
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardDataResult, DashboardStats, GetUserDashboardStatsParams } from '../types'
import { DashboardServiceError, handleSupabaseError } from '../utils/error-handler'

export class DashboardService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetch comprehensive dashboard statistics for a user
   */
  async getUserStats(userId: string): Promise<DashboardStats> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_dashboard_stats', { p_user_id: userId } as GetUserDashboardStatsParams)
        .single()

      if (error) {
        handleSupabaseError(error, 'getUserStats')
      }

      if (!data) {
        throw new DashboardServiceError('No dashboard stats found for user', 'NO_STATS_FOUND', {
          userId,
        })
      }

      // Type-safe conversion with defaults
      const statsData = data as Record<string, unknown>
      return {
        response_rate_percent: (statsData.response_rate_percent as number) || 0,
        reviews_count: (statsData.reviews_count as number) || 0,
        average_rating: (statsData.average_rating as number) || 0,
        replied_reviews_count: (statsData.replied_reviews_count as number) || 0,
        locations_count: (statsData.locations_count as number) || 0,
        accounts_count: (statsData.accounts_count as number) || 0,
        today_reviews_count: (statsData.today_reviews_count as number) || 0,
        weekly_growth: (statsData.weekly_growth as number) || 0,
        reviews_trend: Array.isArray(statsData.reviews_trend)
          ? (statsData.reviews_trend as number[])
          : [],
        youtube_subs: (statsData.youtube_subs as string) || null,
        has_youtube: Boolean(statsData.has_youtube),
        has_accounts: Boolean(statsData.has_accounts),
        streak: (statsData.streak as number) || 0,
      } as DashboardStats
    } catch (error) {
      handleSupabaseError(error, 'DashboardService.getUserStats')
    }
  }

  /**
   * Get total locations count for pagination
   */
  async getTotalLocationsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('gmb_locations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        handleSupabaseError(error, 'getTotalLocationsCount')
      }

      return count || 0
    } catch (error) {
      handleSupabaseError(error, 'DashboardService.getTotalLocationsCount')
    }
  }

  /**
   * Get complete dashboard data with caching consideration
   */
  async getDashboardData(userId: string): Promise<DashboardDataResult> {
    try {
      // Parallel execution for better performance
      const [stats, totalLocations] = await Promise.all([
        this.getUserStats(userId),
        this.getTotalLocationsCount(userId),
      ])

      return {
        stats,
        totalLocations,
        hasMore: totalLocations > 20, // Assuming page size of 20
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      handleSupabaseError(error, 'DashboardService.getDashboardData')
    }
  }

  /**
   * Check if user has any active GMB accounts
   */
  async hasActiveAccounts(userId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('gmb_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        handleSupabaseError(error, 'hasActiveAccounts')
      }

      return (count || 0) > 0
    } catch (error) {
      handleSupabaseError(error, 'DashboardService.hasActiveAccounts')
    }
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(userId: string, limit: number = 10): Promise<unknown[]> {
    try {
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        handleSupabaseError(error, 'getRecentActivity')
      }

      return data || []
    } catch (error) {
      handleSupabaseError(error, 'DashboardService.getRecentActivity')
    }
  }
}
