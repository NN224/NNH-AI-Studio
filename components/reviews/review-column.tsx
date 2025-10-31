"use client"

import { ReviewCard } from "./review-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { GMBReview } from "@/lib/types/database"

interface ReviewColumnProps {
  title: string
  status: string
  reviews: GMBReview[]
  onGenerateResponse: (reviewId: string) => void
  onReply: (reviewId: string) => void
}

export function ReviewColumn({ title, status, reviews, onGenerateResponse, onReply }: ReviewColumnProps) {
  const getStatusColor = () => {
    switch (status) {
      case "new":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
      case "responded":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
    }
  }

  return (
    <div className="flex flex-col bg-card border border-primary/30 rounded-lg p-4 h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Badge className={`${getStatusColor()}`}>{reviews.length}</Badge>
      </div>

      {/* Reviews List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              review={review}
              index={index}
              onGenerateResponse={onGenerateResponse}
              onReply={onReply}
            />
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No {title.toLowerCase()} reviews
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
