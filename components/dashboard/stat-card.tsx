"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  index: number
  emptyMessage?: string
  showEmptyState?: boolean
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  index,
  emptyMessage,
  showEmptyState = false
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const numericValue = typeof value === "string" ? Number.parseFloat(value) : value
  const isEmpty = (typeof numericValue === "number" && numericValue === 0) || 
                  (typeof value === "string" && (value === "0" || value === "0.0" || value === "0%"))

  useEffect(() => {
    if (typeof numericValue === "number" && !isNaN(numericValue)) {
      let start = 0
      const end = numericValue
      const duration = 1000
      const increment = end / (duration / 16)

      const timer = setInterval(() => {
        start += increment
        if (start >= end) {
          setDisplayValue(end)
          clearInterval(timer)
        } else {
          setDisplayValue(start)
        }
      }, 16)

      return () => clearInterval(timer)
    }
  }, [numericValue])

  const changeColor =
    changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground"

  // Render rating with stars if it's the Average Rating card
  const isRating = title.toLowerCase().includes("rating")
  const ratingValue = typeof numericValue === "number" ? numericValue : parseFloat(value.toString())
  const hasRating = !isNaN(ratingValue) && ratingValue > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          "bg-card border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20",
          isEmpty && showEmptyState && "border-muted/50"
        )}
        role="region"
        aria-label={`${title} statistics`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <p 
                className="text-sm font-medium text-muted-foreground"
                id={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {title}
              </p>
              
              {isEmpty && showEmptyState && emptyMessage ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{emptyMessage}</p>
                </div>
              ) : isRating && hasRating ? (
                <div className="flex items-center gap-2">
                  <p 
                    className="text-3xl font-bold text-foreground"
                    aria-label={`Current value: ${ratingValue.toFixed(1)}`}
                  >
                    {ratingValue.toFixed(1)}
                  </p>
                  <div className="flex gap-0.5" role="img" aria-label={`Rating: ${ratingValue.toFixed(1)} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-5 w-5",
                          star <= Math.round(ratingValue)
                            ? "fill-warning text-warning"
                            : "fill-muted text-muted-foreground"
                        )}
                        aria-label={`${star} star${star <= Math.round(ratingValue) ? ' filled' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p 
                  className="text-3xl font-bold text-foreground"
                  aria-label={`Current value: ${typeof value === "string" ? value : Math.round(displayValue).toLocaleString()}`}
                >
                  {typeof value === "string" ? value : Math.round(displayValue).toLocaleString()}
                </p>
              )}
              
              {change && !isEmpty && (
                <p 
                  className={`text-xs font-medium ${changeColor}`}
                  aria-label={`Trend: ${changeType === 'positive' ? 'up' : changeType === 'negative' ? 'down' : 'no change'} by ${change}`}
                >
                  {change}
                </p>
              )}
            </div>
            <div 
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                isEmpty && showEmptyState ? "bg-muted/20" : "bg-primary/20"
              )}
              aria-hidden="true"
            >
              <Icon 
                className={cn(
                  "w-6 h-6",
                  isEmpty && showEmptyState ? "text-muted-foreground" : "text-primary"
                )}
                aria-label={`${title} icon`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
