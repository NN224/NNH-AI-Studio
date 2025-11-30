import { PendingResponsesCard } from "@/components/reviews/ai-cockpit/pending-responses-card";
import { SentimentAnalysisCard } from "@/components/reviews/ai-cockpit/sentiment-analysis-card";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AICockpitClient } from "./ai-cockpit-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.aiCockpit" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/reviews/ai-cockpit`,
      languages: {
        en: "https://nnh.ae/en/reviews/ai-cockpit",
        ar: "https://nnh.ae/ar/reviews/ai-cockpit",
      },
    },
  };
}

export default async function AICockpitPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          AI Cockpit
        </h1>
        <p className="text-muted-foreground mt-2">
          AI-powered review management and analytics
        </p>
      </div>

      <Suspense fallback={<AICockpitSkeleton />}>
        <AICockpitClient />
      </Suspense>
    </div>
  );
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
  );
}
