'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, PauseCircle, Rocket, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type AutopilotStatus = {
  enabled: boolean;
  autoReplyEnabled: boolean;
  autoAnswerEnabled: boolean;
  autoPostEnabled: boolean;
  repliesToday: number;
  questionsToday: number;
  postsToday: number;
  timeSavedMinutes: number;
};

export default function AutopilotStatus() {
  const [status, setStatus] = useState<AutopilotStatus>({
    enabled: false,
    autoReplyEnabled: false,
    autoAnswerEnabled: false,
    autoPostEnabled: false,
    repliesToday: 0,
    questionsToday: 0,
    postsToday: 0,
    timeSavedMinutes: 0,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }
  const router = useRouter();

  // Fetch autopilot stats and settings
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchStats = async () => {
      try {
        // Fetch stats from API
        const statsRes = await fetch('/api/auto-pilot/stats', { cache: 'no-store' });
        if (!statsRes.ok) throw new Error('Failed to fetch stats');

        const statsData = await statsRes.json();
        if (!mounted) return;

        if (statsData.success && statsData.data) {
          setStatus(statsData.data);
        }
      } catch (error) {
        console.error('[AutopilotStatus] Error fetching stats:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Refresh every 30 seconds
    intervalId = setInterval(fetchStats, 30000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  async function toggleGlobal(enabled: boolean) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;
      const { error } = await supabase!
        .from('gmb_accounts')
        .update({ 
          settings: { 
            autopilotEnabled: enabled, 
            autoReplyEnabled: enabled, 
            autoAnswerEnabled: enabled, 
            autoPostEnabled: status.autoPostEnabled 
          } 
        })
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (!error) {
        setStatus((p) => ({ ...p, enabled, autoReplyEnabled: enabled, autoAnswerEnabled: enabled }));
        // Refresh stats after toggle
        const statsRes = await fetch('/api/auto-pilot/stats', { cache: 'no-store' });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success && statsData.data) {
            setStatus(statsData.data);
          }
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePause() {
    toggleGlobal(false);
  }

  function handleConfigure() {
    router.push('/settings/auto-pilot');
  }

  const hours = Math.floor(status.timeSavedMinutes / 60);
  const minutes = status.timeSavedMinutes % 60;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4 text-primary" />
          AI Autopilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Status</div>
          <Switch checked={status.enabled} onCheckedChange={toggleGlobal} disabled={saving} />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Auto-reply to reviews</span>
            <span>{status.repliesToday} today</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Auto-answer questions</span>
            <span>{status.questionsToday} today</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Auto-generate posts</span>
            <span>{status.postsToday} today</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Time saved today: {hours}h {minutes}m
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            disabled={!status.enabled || saving || loading}
            onClick={handlePause}
          >
            Pause <PauseCircle className="ml-1 h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            disabled={saving || loading}
            onClick={handleConfigure}
          >
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


