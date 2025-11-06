"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SentimentBreakdown } from "./sentiment-breakdown"
import { HotTopicsList } from "./hot-topics-list"
import { Skeleton } from "@/components/ui/skeleton"

interface SentimentAnalysisCardProps {
  sentimentData: {
    positive: number
    neutral: number
    negative: number
    topics: Array<{ topic: string; count: number }>
  } | null
  loading?: boolean
}

export function SentimentAnalysisCard({ sentimentData, loading }: SentimentAnalysisCardProps) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    )
  }

  if (!sentimentData) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Sentiment Analysis</CardTitle>
          <CardDescription>Customer emotion breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Sentiment Analysis</CardTitle>
        <CardDescription>Customer emotion breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SentimentBreakdown sentiments={sentimentData} />
        
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Hot Topics:</h4>
          <HotTopicsList topics={sentimentData.topics} />
        </div>
      </CardContent>
    </Card>
  )
}

