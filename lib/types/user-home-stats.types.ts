/**
 * Type definitions for the user_home_stats materialized view
 *
 * This view aggregates all home page statistics for users, reducing
 * database queries from 15+ to just 1 cached query.
 *
 * @see /supabase/migrations/1764177643_add_user_home_stats_view.sql
 */

export interface UserHomeStats {
  /** User ID from auth.users */
  user_id: string;

  /** Total number of active GMB locations */
  locations_count: number;

  /** Total number of reviews received */
  reviews_count: number;

  /** Total number of active GMB accounts connected */
  accounts_count: number;

  /** Number of reviews that have been replied to */
  replied_reviews_count: number;

  /** Average rating across all reviews (0-5) */
  average_rating: number;

  /** Number of reviews received today */
  today_reviews_count: number;

  /** Number of reviews received in last 7 days */
  this_week_reviews_count: number;

  /** Number of reviews received 8-14 days ago */
  last_week_reviews_count: number;

  /** Percentage of reviews that have been replied to (0-100) */
  response_rate: number;

  /** Timestamp of last materialized view refresh */
  last_refreshed_at: string;
}

/**
 * Calculate weekly growth percentage
 * @param thisWeek Number of reviews this week
 * @param lastWeek Number of reviews last week
 * @returns Growth percentage (can be negative)
 */
export function calculateWeeklyGrowth(
  thisWeek: number,
  lastWeek: number,
): number {
  if (lastWeek === 0) return 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}
