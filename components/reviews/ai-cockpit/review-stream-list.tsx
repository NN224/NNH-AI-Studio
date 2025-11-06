"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { ReviewCard } from "./review-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { GMBReview } from "@/lib/types/database"

interface ReviewStreamListProps {
  reviews: (GMBReview & { location_name?: string })[]
  selectedReviewId?: string
  onSelectReview: (review: GMBReview & { location_name?: string }) => void
  loading?: boolean
}

export function ReviewStreamList({ 
  reviews, 
  selectedReviewId, 
  onSelectReview,
  loading 
}: ReviewStreamListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No pending reviews</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            isSelected={selectedReviewId === review.id}
            onClick={() => onSelectReview(review)}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

