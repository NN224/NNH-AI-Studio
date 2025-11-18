'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type ActivityStats = {
  repliesToday: number;
  avgResponseTime: number; // in seconds
  successRate: number; // percentage
};

export function ActivityStatsCard() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/auto-pilot/monitoring', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (mounted && data.success && data.data) {
          const today = data.data.today || {};
          const successRate = today.total > 0 
            ? ((today.success / today.total) * 100) 
            : 0;
          setStats({
            repliesToday: today.total || 0,
            avgResponseTime: today.avgResponseTime || 0,
            successRate,
          });
        }
      } catch (error) {
        console.error('[ActivityStatsCard] Error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    intervalId = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          نشاط اليوم
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-zinc-950/50 rounded-lg">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-zinc-950/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.repliesToday}</div>
              <div className="text-sm text-zinc-400 mt-1">ردود تلقائية</div>
            </div>
            <div className="p-4 bg-zinc-950/50 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {formatResponseTime(stats.avgResponseTime)}
              </div>
              <div className="text-sm text-zinc-400 mt-1">متوسط الوقت</div>
            </div>
            <div className="p-4 bg-zinc-950/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.successRate.toFixed(0)}%</div>
              <div className="text-sm text-zinc-400 mt-1">نسبة النجاح</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-zinc-500">
            <p className="text-sm">لا توجد بيانات بعد</p>
          </div>
        )}
        <p className="text-xs text-zinc-500 text-center mt-4">
          <Clock className="w-3 h-3 inline-block mr-1" />
          يتم التحديث تلقائياً كل 30 ثانية
        </p>
      </CardContent>
    </Card>
  );
}

