import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { SentimentAnalysisCard } from '@/components/reviews/ai-cockpit/sentiment-analysis-card'
import { PendingResponsesCard } from '@/components/reviews/ai-cockpit/pending-responses-card'
import { AICockpitClient } from './ai-cockpit-client'

export async function generateMetadata() {
  const t = await getTranslations('AICockpit')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function AICockpitPage() {
  const t = await getTranslations('AICockpit')
  
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('description')}
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

