import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  count?: number
  type?: "card" | "list" | "stat" | "review"
}

export function LoadingSkeleton({ className, count = 1, type = "card" }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div className={cn("bg-card border border-primary/30 rounded-lg p-6 space-y-4", className)}>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4 shimmer" />
                <Skeleton className="h-4 w-1/2 shimmer" />
              </div>
              <Skeleton className="h-8 w-20 shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full shimmer" />
              <Skeleton className="h-4 w-5/6 shimmer" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 shimmer" />
              <Skeleton className="h-20 shimmer" />
              <Skeleton className="h-20 shimmer" />
            </div>
          </div>
        )
      
      case "stat":
        return (
          <div className={cn("bg-card border border-primary/30 rounded-lg p-6 space-y-3", className)}>
            <Skeleton className="h-4 w-24 shimmer" />
            <Skeleton className="h-8 w-16 shimmer" />
            <Skeleton className="h-3 w-32 shimmer" />
          </div>
        )
      
      case "review":
        return (
          <div className={cn("bg-card border border-primary/30 rounded-lg p-4 space-y-4", className)}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full shimmer" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32 shimmer" />
                <Skeleton className="h-3 w-24 shimmer" />
              </div>
            </div>
            <Skeleton className="h-16 w-full shimmer" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 shimmer" />
              <Skeleton className="h-9 flex-1 shimmer" />
            </div>
          </div>
        )
      
      case "list":
      default:
        return (
          <div className={cn("space-y-3", className)}>
            <Skeleton className="h-4 w-full shimmer" />
            <Skeleton className="h-4 w-5/6 shimmer" />
            <Skeleton className="h-4 w-4/6 shimmer" />
          </div>
        )
    }
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  )
}
