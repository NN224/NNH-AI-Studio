"use client";

import { GMBLocation } from "@/lib/types/gmb-types";
import { useLocationMetrics } from "@/hooks/features/use-location-metrics";
import { HealthScoreCard } from "./command-center/HealthScoreCard";
import { InsightsSummary } from "./command-center/InsightsSummary";
import { QuickActions } from "./command-center/QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface LocationAICommandCenterProps {
  location: GMBLocation;
}

export function LocationAICommandCenter({
  location,
}: LocationAICommandCenterProps) {
  const metrics = useLocationMetrics(location);

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* Left Column - Main Stats */}
      <div className="md:col-span-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <HealthScoreCard
            score={metrics.healthScore}
            status={metrics.status}
            statusTone={metrics.statusTone}
          />
          <InsightsSummary insights={metrics.insights} />
        </div>

        {/* AI Insights Section */}
        <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.aiInsights.length > 0 ? (
              <ul className="space-y-3">
                {metrics.aiInsights.map((insight, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                    <span className="text-muted-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No AI insights available yet. Wait for the next analysis cycle.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Actions */}
      <div className="md:col-span-4 space-y-6">
        <QuickActions />
      </div>
    </div>
  );
}
