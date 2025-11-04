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
        return "bg-success/20 text-success border-success/30"
      case "negative":
        return "bg-destructive/20 text-destructive border-destructive/30"
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30"
    }
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      
      const now = new Date()
      const diffTime = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffWeeks = Math.floor(diffDays / 7)
      const diffMonths = Math.floor(diffDays / 30)
      
      if (diffDays === 0) {
        return 'Today'
      } else if (diffDays === 1) {
        return '1 day ago'
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else if (diffWeeks === 1) {
        return '1 week ago'
      } else if (diffWeeks < 4) {
        return `${diffWeeks} weeks ago`
      } else if (diffMonths === 1) {
        return '1 month ago'
      } else if (diffMonths < 12) {
        return `${diffMonths} months ago`
      } else {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
    } catch {
      return ''
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="bg-card border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <motion.div 
                whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
              >
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
                        transition={{ duration: 0.3, delay: index * 0.05 + i * 0.05 }}
                      >
                        <Star
                          className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          aria-label={`${i + 1} star${i < review.rating ? ' filled' : ''}`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.review_date || review.created_at)}
                  </span>
                </div>
              </div>
            </div>
            {review.ai_sentiment && (
              <Badge 
                className={`${getSentimentColor(review.ai_sentiment)} flex items-center gap-1 transition-all duration-200`}
                aria-label={`Review sentiment: ${review.ai_sentiment}`}
              >
                {getSentimentIcon(review.ai_sentiment)}
                <span className="capitalize">{review.ai_sentiment}</span>
              </Badge>
            )}
          </div>

          {/* Review Comment */}
          {(review.review_text || review.comment) && (
            <p className="text-sm text-foreground leading-relaxed">{review.review_text || review.comment}</p>
          )}

          {/* AI Suggested Reply */}
          {(review.ai_generated_response || review.ai_suggested_reply) && !(review.reply_text || review.review_reply) && (
            <motion.div 
              className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" aria-label="AI suggestion icon" />
                <span className="text-xs font-medium text-primary">AI Suggested Response</span>
              </div>
              <p className="text-xs text-foreground/80">{review.ai_generated_response || review.ai_suggested_reply}</p>
            </motion.div>
          )}

          {/* Existing Reply */}
          {(review.reply_text || review.review_reply) && (
            <div className="p-3 rounded-lg bg-secondary border border-primary/20">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your Response</p>
              <p className="text-sm text-foreground">{review.reply_text || review.review_reply}</p>
              {(review.reply_date || review.replied_at) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Replied on {formatDate(review.reply_date || review.replied_at || '')}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!(review.reply_text || review.review_reply) ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerateResponse(review.id)}
                  className="flex-1 border-primary/30 text-foreground hover:bg-primary/20 transition-all duration-200 hover:scale-105 h-11 md:h-9 min-h-[44px] md:min-h-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                  aria-label="Generate AI response for this review"
                >
                  <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                  Generate AI Response
                </Button>
                <Button
                  size="sm"
                  onClick={() => onReply(review.id)}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white transition-all duration-200 hover:scale-105 h-11 md:h-9 min-h-[44px] md:min-h-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                  aria-label="Reply to this review"
                >
                  Reply
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReply(review.id)}
                  className="flex-1 border-primary/30 text-foreground hover:bg-primary/20 transition-all duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                  aria-label="Edit reply to this review"
                >
                  Edit Reply
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
