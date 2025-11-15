import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardSkeletonProps {
  section?: 'stats' | 'actions' | 'widget' | 'full'
  count?: number
}

function StatsSkeletonLoader({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function QuickActionsSkeletonLoader() {
  return (
    <Card className="animate-in fade-in duration-500">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="border rounded-lg p-4 space-y-2 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function WidgetSkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <Card className="flex flex-col animate-in fade-in duration-500">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i} 
            className="space-y-2 border-b last:border-0 pb-4 last:pb-0 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
      <div className="p-6 pt-0">
        <Skeleton className="h-9 w-full" />
      </div>
    </Card>
  )
}

function FullDashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>
      
      <StatsSkeletonLoader />
      <QuickActionsSkeletonLoader />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WidgetSkeletonLoader />
        <WidgetSkeletonLoader />
        <WidgetSkeletonLoader />
      </div>
    </div>
  )
}

export function DashboardSkeleton({ section = 'widget', count }: DashboardSkeletonProps) {
  switch (section) {
    case 'stats':
      return <StatsSkeletonLoader count={count} />
    case 'actions':
      return <QuickActionsSkeletonLoader />
    case 'widget':
      return <WidgetSkeletonLoader count={count} />
    case 'full':
      return <FullDashboardSkeleton />
    default:
      return <WidgetSkeletonLoader count={count} />
  }
}

