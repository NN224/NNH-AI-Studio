"use client"

import { Badge } from "@/components/ui/badge"
import { ThumbsUp, Minus, ThumbsDown } from "lucide-react"

interface SentimentBreakdownProps {
  sentiments: {
    positive: number
    neutral: number
    negative: number
  }
}

export function SentimentBreakdown({ sentiments }: SentimentBreakdownProps) {
  const sentimentItems = [
    {
      label: "Positive",
      value: sentiments.positive,
      icon: ThumbsUp,
      color: "text-green-500",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
    },
    {
      label: "Neutral",
      value: sentiments.neutral,
      icon: Minus,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/30",
    },
    {
      label: "Negative",
      value: sentiments.negative,
      icon: ThumbsDown,
      color: "text-red-500",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
    },
  ]

  return (
    <div className="space-y-3">
      {sentimentItems.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className={`flex items-center justify-between p-3 rounded-lg border ${item.bgColor} ${item.borderColor}`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <Badge variant="outline" className="font-semibold">
              {item.value}%
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

