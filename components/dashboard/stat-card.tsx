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
    changeType === "positive" ? "text-green-500" : changeType === "negative" ? "text-red-500" : "text-muted-foreground"

  // Render rating with stars if it's the Average Rating card
  const isRating = title.toLowerCase().includes("rating")
  const ratingValue = typeof numericValue === "number" ? numericValue : parseFloat(value.toString())
  const hasRating = !isNaN(ratingValue) && ratingValue > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className={cn(
        "bg-card border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20",
        isEmpty && showEmptyState && "border-muted/50"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              
              {isEmpty && showEmptyState && emptyMessage ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {typeof value === "string" ? value : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
                </div>
              ) : isRating && hasRating ? (
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-foreground">{ratingValue.toFixed(1)}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-5 w-5",
                          star <= Math.round(ratingValue)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-muted text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  {typeof value === "string" ? value : Math.round(displayValue).toLocaleString()}
                </p>
              )}
              
              {change && !isEmpty && <p className={`text-xs font-medium ${changeColor}`}>{change}</p>}
            </div>
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
              isEmpty && showEmptyState ? "bg-muted/20" : "bg-primary/20"
            )}>
              <Icon className={cn(
                "w-6 h-6",
                isEmpty && showEmptyState ? "text-muted-foreground" : "text-primary"
              )} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
