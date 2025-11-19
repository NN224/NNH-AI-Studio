'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Lazy loading components with proper loading fallbacks
export const LazyStatsCards = dynamic(
  () => import('./stats-cards'),
  {
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    ),
    ssr: false,
  }
);

export const LazyPerformanceChart = dynamic(
  () => import('./performance-comparison-chart').then(mod => ({ default: mod.PerformanceComparisonChart })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

// Removed LazyLocationHighlights - component deleted
// Removed LazyAIInsights - component deleted
// Removed LazyGamificationWidget - component deleted

// Simple fallback components
export const LazyLocationHighlights = ({ locations, loading }: any) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-[150px]" />
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Location highlights coming soon</p>
    </CardContent>
  </Card>
);

export const LazyAIInsights = ({ stats, loading }: any) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-[120px]" />
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">AI insights coming soon</p>
    </CardContent>
  </Card>
);

export const LazyGamificationWidget = ({ stats }: any) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-[140px]" />
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Gamification coming soon</p>
    </CardContent>
  </Card>
);
