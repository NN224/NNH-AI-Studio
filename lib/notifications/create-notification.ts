/**
 * Utility functions for creating notifications
 * Centralized notification creation logic to ensure consistency
 */

import { createAdminClient } from '@/lib/supabase/server'

export type NotificationType = 'review' | 'insight' | 'achievement' | 'alert' | 'update' | 'system'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a notification for a user
 * Uses admin client to bypass RLS for system-generated notifications
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    message,
    priority = 'medium',
    actionUrl,
    actionLabel,
    metadata = {},
  } = params

  try {
    const admin = createAdminClient()

    const notificationData = {
      user_id: userId,
      type,
      title,
      message,
      link: actionUrl || null,
      metadata: {
        ...metadata,
        priority,
        actionUrl,
        actionLabel,
      },
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('notifications')
      .insert(notificationData)
      .select()
      .single()

    if (error) {
      console.error('[Notifications] Failed to create notification:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error)
    return { success: false, error }
  }
}

/**
 * Create a sync completion notification
 */
export async function createSyncNotification(
  userId: string,
  counts: { locations?: number; reviews?: number; media?: number; questions?: number },
  tookMs: number,
) {
  const totalItems =
    (counts.locations || 0) + (counts.reviews || 0) + (counts.media || 0) + (counts.questions || 0)

  const parts: string[] = []
  if (counts.locations) parts.push(`${counts.locations} locations`)
  if (counts.reviews) parts.push(`${counts.reviews} reviews`)
  if (counts.media) parts.push(`${counts.media} media`)
  if (counts.questions) parts.push(`${counts.questions} questions`)

  const message =
    parts.length > 0
      ? `Synced ${parts.join(', ')} in ${Math.round(tookMs / 1000)}s`
      : 'Sync completed successfully'

  return createNotification({
    userId,
    type: 'update',
    title: 'Sync Complete',
    message,
    priority: 'low',
    actionUrl: '/dashboard',
    actionLabel: 'View Dashboard',
    metadata: {
      counts,
      tookMs,
      totalItems,
    },
  })
}

/**
 * Create a sync error notification
 */
export async function createSyncErrorNotification(userId: string, errorMessage: string) {
  return createNotification({
    userId,
    type: 'alert',
    title: 'Sync Failed',
    message: errorMessage,
    priority: 'high',
    actionUrl: '/settings/integrations',
    actionLabel: 'Check Connection',
    metadata: {
      errorMessage,
    },
  })
}

/**
 * Create a new review notification
 */
export async function createReviewNotification(
  userId: string,
  reviewerName: string,
  rating: number,
  locationName?: string,
) {
  const isPositive = rating >= 4

  const title = isPositive ? `New ${rating}-star review!` : 'New review needs attention'

  const message = locationName
    ? `${reviewerName} left a ${rating}-star review for ${locationName}`
    : `${reviewerName} left a ${rating}-star review`

  return createNotification({
    userId,
    type: 'review',
    title,
    message,
    priority: isPositive ? 'medium' : 'high',
    actionUrl: '/reviews',
    actionLabel: rating < 4 ? 'Reply Now' : 'View Review',
    metadata: {
      rating,
      reviewerName,
      locationName,
      isPositive,
    },
  })
}

/**
 * Create an achievement notification
 */
export async function createAchievementNotification(
  userId: string,
  achievementTitle: string,
  achievementDescription: string,
) {
  return createNotification({
    userId,
    type: 'achievement',
    title: achievementTitle,
    message: achievementDescription,
    priority: 'medium',
    actionUrl: '/dashboard',
    actionLabel: 'View Stats',
    metadata: {
      achievementTitle,
    },
  })
}

/**
 * Create an AI insight notification
 */
export async function createInsightNotification(
  userId: string,
  insightTitle: string,
  insightMessage: string,
) {
  return createNotification({
    userId,
    type: 'insight',
    title: insightTitle,
    message: insightMessage,
    priority: 'low',
    actionUrl: '/analytics',
    actionLabel: 'View Analytics',
    metadata: {
      insightTitle,
    },
  })
}
