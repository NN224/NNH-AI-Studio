'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeUpdate {
  type: 'review' | 'post' | 'question' | 'location' | 'activity'
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  data: any
  timestamp: string
}

export interface UseDashboardRealtimeOptions {
  userId: string
  onReviewUpdate?: (data: any) => void
  onPostUpdate?: (data: any) => void
  onQuestionUpdate?: (data: any) => void
  onLocationUpdate?: (data: any) => void
  onActivityUpdate?: (data: any) => void
  enabled?: boolean
}

export function useDashboardRealtime({
  userId,
  onReviewUpdate,
  onPostUpdate,
  onQuestionUpdate,
  onLocationUpdate,
  onActivityUpdate,
  enabled = true,
}: UseDashboardRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const handleUpdate = useCallback(
    (type: RealtimeUpdate['type'], action: RealtimeUpdate['action'], payload: any) => {
      const update: RealtimeUpdate = {
        type,
        action,
        data: payload.new || payload.old,
        timestamp: new Date().toISOString(),
      }

      setLastUpdate(update)
      setUpdateCount((prev) => prev + 1)

      // Call specific handlers
      switch (type) {
        case 'review':
          onReviewUpdate?.(payload)
          break
        case 'post':
          onPostUpdate?.(payload)
          break
        case 'question':
          onQuestionUpdate?.(payload)
          break
        case 'location':
          onLocationUpdate?.(payload)
          break
        case 'activity':
          onActivityUpdate?.(payload)
          break
      }
    },
    [onReviewUpdate, onPostUpdate, onQuestionUpdate, onLocationUpdate, onActivityUpdate]
  )

  useEffect(() => {
    if (!enabled || !userId) return

    const supabase = supabaseRef.current

    // Create channel for dashboard updates
    const channel = supabase!
      .channel(`dashboard-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gmb_reviews',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleUpdate('review', payload.eventType as any, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gmb_posts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleUpdate('post', payload.eventType as any, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gmb_questions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleUpdate('question', payload.eventType as any, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gmb_locations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleUpdate('location', payload.eventType as any, payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleUpdate('activity', payload.eventType as any, payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase!.removeChannel(channelRef.current)
        channelRef.current = null
        setIsConnected(false)
      }
    }
  }, [userId, enabled, handleUpdate])

  const reconnect = useCallback(() => {
    if (channelRef.current) {
      const supabase = supabaseRef.current
      supabase!.removeChannel(channelRef.current)
      channelRef.current = null
    }
    // Trigger re-subscription by toggling enabled
    setIsConnected(false)
  }, [])

  return {
    isConnected,
    lastUpdate,
    updateCount,
    reconnect,
  }
}

