'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useDashboardRealtime(
  userId: string | null,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      // Subscribe to reviews changes
      channel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'gmb_reviews',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📡 Review changed:', payload);
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gmb_questions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📡 Question changed:', payload);
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'gmb_locations',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📡 Location updated:', payload);
            onUpdate();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscriptions active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription error');
          }
        });
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log('🔌 Real-time subscriptions disconnected');
      }
    };
  }, [userId, onUpdate]);
}

