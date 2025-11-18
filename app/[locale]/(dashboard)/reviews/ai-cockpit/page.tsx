import { Suspense } from 'react'
import { SentimentAnalysisCard } from '@/components/reviews/ai-cockpit/sentiment-analysis-card'
import { PendingResponsesCard } from '@/components/reviews/ai-cockpit/pending-responses-card'
import { AICockpitClient } from './ai-cockpit-client'

export async function generateMetadata() {
  return {
    title: 'AI Cockpit',
    description: 'AI-powered review management cockpit',
  }
}

export default async function AICockpitPage() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dashboard:refresh'));
    console.log('[AICockpitPage] AI Cockpit loaded, dashboard refresh triggered');
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Cockpit</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered review management and analytics
        </p>
      </div>

      <Suspense fallback={<AICockpitSkeleton />}>
        <AICockpitClient />
      </Suspense>
    </div>
  )
}

function AICockpitSkeleton() {
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <SentimentAnalysisCard sentimentData={null} loading={true} />
      <PendingResponsesCard
        reviews={[]}
        stats={{ pending: 0, responseRate: 0, avgTime: 0 }}
        onSelectReview={() => {}}
        loading={true}
      />
    </div>
  )
}
