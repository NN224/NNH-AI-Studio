'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Flame, Star, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GamificationWidgetProps {
  stats: {
    healthScore: number;
    responseRate: number;
    averageRating: number;
    totalReviews: number;
    pendingReviews: number;
  };
  locale?: string;
}

export function GamificationWidget({ stats, locale = 'en' }: GamificationWidgetProps) {
  const isArabic = locale === 'ar';

  const responseGoal = 90;
  const ratingGoal = 5;
  const nextReviewsMilestone = Math.ceil(stats.totalReviews / 100) * 100 || 100;
  const reviewsProgress = Math.min(100, (stats.totalReviews / nextReviewsMilestone) * 100);

  const badges: { icon: React.ReactNode; label: string }[] = [];
  if (stats.averageRating >= 4.7) badges.push({ icon: <Star className="w-4 h-4 text-warning fill-warning" />, label: isArabic ? 'تقييم ذهبي' : 'Golden Rating' });
  if (stats.responseRate >= 90) badges.push({ icon: <Flame className="w-4 h-4 text-primary" />, label: isArabic ? 'سلسلة الردود' : 'Reply Streak' });
  if (stats.healthScore >= 85) badges.push({ icon: <Trophy className="w-4 h-4 text-success" />, label: isArabic ? 'صحة ممتازة' : 'Excellent Health' });

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {isArabic ? 'الإنجازات والتقدّم' : 'Achievements & Progress'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Response Rate Goal */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              {isArabic ? 'معدل الرد' : 'Response Rate'}
            </div>
            <span className="text-muted-foreground">{stats.responseRate.toFixed(0)}% / {responseGoal}%</span>
          </div>
          <Progress value={Math.min(100, (stats.responseRate / responseGoal) * 100)} />
        </div>

        {/* Health Score Goal */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-success" />
              {isArabic ? 'درجة الصحة' : 'Health Score'}
            </div>
            <span className="text-muted-foreground">{stats.healthScore}% / 100%</span>
          </div>
          <Progress value={stats.healthScore} />
        </div>

        {/* Reviews milestone */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" />
              {isArabic ? 'عدد المراجعات' : 'Reviews Count'}
            </div>
            <span className="text-muted-foreground">{stats.totalReviews} / {nextReviewsMilestone}</span>
          </div>
          <Progress value={reviewsProgress} />
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {badges.map((b, i) => (
              <div key={i} className="px-2 py-1 text-xs rounded-full border bg-background flex items-center gap-1">
                {b.icon}
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
