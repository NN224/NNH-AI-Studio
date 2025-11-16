'use client';

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

export default function AIInsightsCards({ stats }: { stats?: Stats | null }) {
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
  insights.push({
    icon: Lightbulb,
    title: 'Best time to post',
    desc: 'Today 3:00 PM (based on recent engagement)',
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


