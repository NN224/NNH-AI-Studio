"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AICopilotStatus } from "./ai-copilot-status"
import { ReviewStreamList } from "./review-stream-list"
import { EmptyState } from "./empty-state"
import type { GMBReview } from "@/lib/types/database"

interface PendingResponsesCardProps {
  reviews: (GMBReview & { location_name?: string })[]
  stats: {
    pending: number
    responseRate: number
    avgTime: number
  }
  selectedReview?: GMBReview & { location_name?: string }
  onSelectReview: (review: GMBReview & { location_name?: string }) => void
  loading?: boolean
}

export function PendingResponsesCard({
  reviews,
  stats,
  selectedReview,
  onSelectReview,
  loading
}: PendingResponsesCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-white">Pending Responses</CardTitle>
        <CardDescription>Prioritize and resolve reviews by impact and sentiment</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 min-h-0">
        <AICopilotStatus 
          status={loading ? "processing" : "ready"} 
          stats={stats} 
        />
        
        <div className="flex-1 min-h-0">
          <h4 className="text-sm font-semibold text-foreground mb-3">Review Stream</h4>
          <div className="text-xs text-muted-foreground mb-3">Priority Sorted</div>
          
          {selectedReview ? (
            <div className="h-[400px]">
              <ReviewStreamList
                reviews={reviews}
                selectedReviewId={selectedReview.id}
                onSelectReview={onSelectReview}
                loading={loading}
              />
            </div>
          ) : (
            <div className="h-[400px]">
              <ReviewStreamList
                reviews={reviews}
                onSelectReview={onSelectReview}
                loading={loading}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

