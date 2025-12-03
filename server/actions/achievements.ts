'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface UserProgress {
  id: string
  user_id: string
  current_level: number
  total_points: number
  streak_days: number
  last_activity_date: string | null
  created_at: string
  updated_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  achievement_name: string
  achievement_description: string | null
  category: 'reviews' | 'growth' | 'engagement' | 'special'
  points: number
  level: 'bronze' | 'silver' | 'gold' | 'platinum'
  progress: number
  max_progress: number | null
  unlocked: boolean
  unlocked_at: string | null
  reward_type: 'badge' | 'feature' | 'discount' | 'bonus' | null
  reward_value: string | null
  created_at: string
  updated_at: string
}

/**
 * Get user progress (level, points, streak)
 */
export async function getUserProgress(): Promise<UserProgress | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      logger.error(
        'Error fetching user progress',
        error instanceof Error ? error : new Error(String(error)),
      )
      return null
    }

    return data
  } catch (error) {
    logger.error(
      'Error in getUserProgress',
      error instanceof Error ? error : new Error(String(error)),
    )
    return null
  }
}

/**
 * Get user achievements
 */
export async function getUserAchievements(
  filter?: 'all' | 'unlocked' | 'locked',
): Promise<UserAchievement[]> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    let query = supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (filter === 'unlocked') {
      query = query.eq('unlocked', true)
    } else if (filter === 'locked') {
      query = query.eq('unlocked', false)
    }

    const { data, error } = await query

    if (error) {
      logger.error(
        'Error fetching user achievements',
        error instanceof Error ? error : new Error(String(error)),
      )
      return []
    }

    return data || []
  } catch (error) {
    logger.error(
      'Error in getUserAchievements',
      error instanceof Error ? error : new Error(String(error)),
    )
    return []
  }
}

/**
 * Initialize user progress and achievements
 */
export async function initializeUserProgress(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Not authenticated - silently return
      return false
    }

    // Try RPC first, fallback to direct insert
    const { error: rpcError } = await supabase.rpc('initialize_user_progress', {
      p_user_id: user.id,
    })

    if (rpcError) {
      // Fallback: direct insert if RPC doesn't exist
      const { error: insertError } = await supabase
        .from('user_progress')
        .upsert({ user_id: user.id, level: 1, xp: 0, total_xp: 0 }, { onConflict: 'user_id' })

      if (insertError) {
        // Table might not exist - just log and continue
        logger.warn('User progress table not available', { userId: user.id })
        return false
      }
    }

    return true
  } catch {
    // Silently fail - this is not critical
    return false
  }
}

/**
 * Update user achievements (calculate progress and unlock)
 */
export async function updateUserAchievements(): Promise<number> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase.rpc('update_user_achievements', {
      p_user_id: user.id,
    })

    if (error) {
      logger.error(
        'Error updating user achievements',
        error instanceof Error ? error : new Error(String(error)),
      )
      return 0
    }

    return data || 0
  } catch (error) {
    logger.error(
      'Error in updateUserAchievements',
      error instanceof Error ? error : new Error(String(error)),
    )
    return 0
  }
}

/**
 * Get achievements grouped by category
 */
export async function getAchievementsByCategory(): Promise<Record<string, UserAchievement[]>> {
  try {
    const achievements = await getUserAchievements('all')

    const grouped = achievements.reduce(
      (acc, achievement) => {
        if (!acc[achievement.category]) {
          acc[achievement.category] = []
        }
        acc[achievement.category].push(achievement)
        return acc
      },
      {} as Record<string, UserAchievement[]>,
    )

    return grouped
  } catch (error) {
    logger.error(
      'Error in getAchievementsByCategory',
      error instanceof Error ? error : new Error(String(error)),
    )
    return {}
  }
}

/**
 * Get achievement statistics
 */
export async function getAchievementStats(): Promise<{
  total: number
  unlocked: number
  locked: number
  totalPoints: number
  unlockedPercentage: number
}> {
  try {
    const achievements = await getUserAchievements('all')
    const unlocked = achievements.filter((a) => a.unlocked)
    const locked = achievements.filter((a) => !a.unlocked)
    const totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0)

    return {
      total: achievements.length,
      unlocked: unlocked.length,
      locked: locked.length,
      totalPoints,
      unlockedPercentage:
        achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0,
    }
  } catch (error) {
    logger.error(
      'Error in getAchievementStats',
      error instanceof Error ? error : new Error(String(error)),
    )
    return {
      total: 0,
      unlocked: 0,
      locked: 0,
      totalPoints: 0,
      unlockedPercentage: 0,
    }
  }
}
