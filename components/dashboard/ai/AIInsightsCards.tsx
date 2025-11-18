'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

type Stats = {
  total_reviews?: number;
  avg_rating?: number;
  pending_reviews?: number;
  pending_questions?: number;
  reviews_this_month?: number;
  response_rate?: number;
  reviews_trend?: number;
};

type BestTimeToPost = {
  hour: number;
  minute: number;
  confidence: 'low' | 'medium' | 'high';
  reason?: string;
};

export default function AIInsightsCards({ stats }: { stats?: Stats | null }) {
  const [bestTime, setBestTime] = useState<BestTimeToPost | null>(null);
  const [loadingTime, setLoadingTime] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/best-time-to-post', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (mounted && data.success) {
          setBestTime(data.data);
        }
      } catch (error) {
        console.error('[AIInsightsCards] Error fetching best time:', error);
      } finally {
        if (mounted) setLoadingTime(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const insights: { icon: any; title: string; desc: string; tone: 'warn' | 'tip' | 'trend' }[] = [];
  const s = stats || {};
  
  if ((s.pending_reviews ?? 0) > 0) {
    insights.push({
      icon: AlertTriangle,
      title: 'Negative impact risk',
      desc: `${s.pending_reviews} review(s) pending. Faster replies boost visibility.`,
      tone: 'warn',
    });
  }

  // Best time to post - dynamic
  const timeDesc = loadingTime 
    ? 'Calculating...'
    : bestTime
    ? `Today ${bestTime.hour.toString().padStart(2, '0')}:${bestTime.minute.toString().padStart(2, '0')} (${bestTime.reason || 'based on recent engagement'})`
    : 'Today 3:00 PM (default)';
  
  insights.push({
    icon: Lightbulb,
    title: 'Best time to post',
    desc: timeDesc,
    tone: 'tip',
  });

  if (typeof s.reviews_trend === 'number') {
    const sign = s.reviews_trend > 0 ? '+' : '';
    insights.push({
      icon: TrendingUp,
      title: 'Review trend',
      desc: `${sign}${s.reviews_trend}% vs last week.`,
      tone: 'trend',
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {insights.map((ins, idx) => {
        const Icon = ins.icon;
        return (
          <Card key={idx} className="border-primary/20 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className={`h-4 w-4 ${ins.tone === 'warn' ? 'text-orange-500' : ins.tone === 'tip' ? 'text-primary' : 'text-green-500'}`} />
                {ins.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {ins.desc}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


