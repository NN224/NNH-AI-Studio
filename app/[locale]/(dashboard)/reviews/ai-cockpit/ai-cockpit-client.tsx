"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { SentimentAnalysisCard } from '@/components/reviews/ai-cockpit/sentiment-analysis-card'
import { PendingResponsesCard } from '@/components/reviews/ai-cockpit/pending-responses-card'
import { EmptyState } from '@/components/reviews/ai-cockpit/empty-state'
import { useSentimentAnalysis } from '@/hooks/use-sentiment-analysis'
import { usePendingReviews } from '@/hooks/use-pending-reviews'
import { useAIResponseGenerator } from '@/hooks/use-ai-response-generator'
import type { GMBReview } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function AICockpitClient() {
  const t = useTranslations('AICockpit')
  const { data: sentimentData, loading: sentimentLoading } = useSentimentAnalysis()
  const { reviews, stats, loading: reviewsLoading } = usePendingReviews()
  const { generate, loading: generating } = useAIResponseGenerator()
  
  const [selectedReview, setSelectedReview] = useState<(GMBReview & { location_name?: string }) | null>(null)
  const [generatedResponse, setGeneratedResponse] = useState<string | null>(null)

  const handleSelectReview = (review: GMBReview & { location_name?: string }) => {
    setSelectedReview(review)
    setGeneratedResponse(null)
  }

  const handleGenerateResponse = async () => {
    if (!selectedReview) return

    const response = await generate({
      reviewId: selectedReview.id,
      reviewText: selectedReview.review_text || selectedReview.comment || '',
      rating: selectedReview.rating,
      locationName: selectedReview.location_name,
    })

    if (response) {
      setGeneratedResponse(response)
    }
  }

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Left Column: Sentiment Analysis */}
      <div className="space-y-6">
        <SentimentAnalysisCard 
          sentimentData={sentimentData} 
          loading={sentimentLoading} 
        />
      </div>

      {/* Right Column: Pending Responses */}
      <div className="space-y-6">
        <PendingResponsesCard
          reviews={reviews}
          stats={stats}
          selectedReview={selectedReview || undefined}
          onSelectReview={handleSelectReview}
          loading={reviewsLoading}
        />
      </div>

      {/* Selected Review Detail View */}
      {selectedReview && (
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Review from {selectedReview.reviewer_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rating: {selectedReview.rating}/5</span>
                    {selectedReview.location_name && (
                      <>
                        <span>•</span>
                        <span>{selectedReview.location_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleGenerateResponse}
                  disabled={generating}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generating ? 'Generating...' : t('generateResponse')}
                </Button>
              </div>

              <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selectedReview.review_text || selectedReview.comment || 'No review text'}
                </p>
              </div>

              {generatedResponse && (
                <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-4 border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-orange-500">AI Generated Response</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {generatedResponse}
                  </p>
                </div>
              )}

              {!generatedResponse && !generating && (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

