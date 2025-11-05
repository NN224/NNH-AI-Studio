'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

export function useDashboardRealtime(
  userId: string | null,
  onUpdate: () => void
) {
  const router = useRouter();

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
        .on('system', { event: 'error' }, (error) => {
          console.error('Realtime subscription error:', error);
          
          // Check if it's an auth error
          const errorMessage = error?.message || '';
          if (errorMessage.includes('JWT') || 
              errorMessage.includes('session') ||
              errorMessage.includes('expired') ||
              errorMessage.includes('Invalid Refresh Token')) {
            toast.error('Session expired. Redirecting to login...');
            
            // Sign out and redirect
            supabase.auth.signOut().finally(() => {
              router.push('/auth/login');
            });
          }
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscriptions active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error:', err);
            toast.error('Real-time updates disconnected');
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ Channel subscription timed out, retrying...');
          }
        });
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
        console.log('🔌 Real-time subscriptions disconnected');
      }
    };
  }, [userId, onUpdate, router]);
}

