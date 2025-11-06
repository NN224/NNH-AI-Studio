"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import type { GMBReview } from "@/lib/types/database"
import { motion } from "framer-motion"
import { useState } from "react"

interface ReviewCardProps {
  review: GMBReview & { location_name?: string }
  isSelected?: boolean
  onClick: () => void
}

export function ReviewCard({ review, isSelected, onClick }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const reviewText = review.review_text || review.comment || ""
  const shouldTruncate = reviewText.length > 150
  const displayText = shouldTruncate && !isExpanded 
    ? reviewText.substring(0, 150) + "..." 
    : reviewText

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      
      const now = new Date()
      const diffTime = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      return `${Math.floor(diffDays / 30)} months ago`
    } catch {
      return ''
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "negative":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      default:
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`bg-zinc-900 border transition-colors cursor-pointer ${
          isSelected 
            ? "border-orange-500 shadow-lg shadow-orange-500/20" 
            : "border-zinc-800 hover:border-orange-500/50"
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 border-2 border-zinc-700">
                <AvatarFallback className="bg-zinc-800 text-orange-500 font-semibold">
                  {review.reviewer_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{review.reviewer_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < review.rating 
                            ? "fill-orange-500 text-orange-500" 
                            : "text-zinc-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.review_date || review.created_at)}
                  </span>
                </div>
              </div>
            </div>
            {review.ai_sentiment && (
              <Badge className={getSentimentColor(review.ai_sentiment)}>
                {review.ai_sentiment}
              </Badge>
            )}
          </div>

          {/* Review Text */}
          {reviewText && (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {displayText}
              {shouldTruncate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                  }}
                  className="ml-1 text-orange-500 hover:text-orange-400 font-medium"
                >
                  {isExpanded ? " read less" : " read more"}
                </button>
              )}
            </p>
          )}

          {/* Location */}
          {review.location_name && (
            <div className="text-xs text-muted-foreground">
              📍 {review.location_name}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

