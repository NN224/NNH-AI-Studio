"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, ThumbsUp, ThumbsDown, Minus, Sparkles } from "lucide-react"
import type { GMBReview } from "@/lib/types/database"
import { motion } from "framer-motion"

interface ReviewCardProps {
  review: GMBReview
  onGenerateResponse: (reviewId: string) => void
  onReply: (reviewId: string) => void
  index?: number
}

export function ReviewCard({ review, onGenerateResponse, onReply, index = 0 }: ReviewCardProps) {
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="w-4 h-4" />
      case "negative":
        return <ThumbsDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "negative":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card className="bg-card border-primary/30 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{review.reviewer_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.03 + i * 0.05 }}
                      >
                        <Star
                          className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                </div>
              </div>
            </div>
            {review.ai_sentiment && (
              <Badge className={`${getSentimentColor(review.ai_sentiment)} flex items-center gap-1 transition-all duration-200`}>
                {getSentimentIcon(review.ai_sentiment)}
                <span className="capitalize">{review.ai_sentiment}</span>
              </Badge>
            )}
          </div>

          {/* Review Comment */}
          {review.comment && <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>}

          {/* AI Suggested Reply */}
          {review.ai_suggested_reply && !review.review_reply && (
            <motion.div 
              className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">AI Suggested Response</span>
              </div>
              <p className="text-xs text-foreground/80">{review.ai_suggested_reply}</p>
            </motion.div>
          )}

          {/* Existing Reply */}
          {review.review_reply && (
            <div className="p-3 rounded-lg bg-secondary border border-primary/20">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your Response</p>
              <p className="text-sm text-foreground">{review.review_reply}</p>
              {review.replied_at && (
                <p className="text-xs text-muted-foreground mt-2">Replied on {formatDate(review.replied_at)}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!review.review_reply && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerateResponse(review.id)}
                  className="flex-1 border-primary/30 text-foreground hover:bg-primary/20 transition-all duration-200 hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Response
                </Button>
                <Button
                  size="sm"
                  onClick={() => onReply(review.id)}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white transition-all duration-200 hover:scale-105"
                >
                  Reply
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
