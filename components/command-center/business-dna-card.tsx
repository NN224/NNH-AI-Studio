"use client";

/**
 * 🧠 BUSINESS DNA CARD
 *
 * Displays the Business DNA status and key insights.
 * Shows when confidence score is >= 60%
 */

import { Brain, TrendingUp, Users, Star, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BusinessDNA } from "@/lib/services/business-dna-service";

export interface BusinessDNACardProps {
  dna: BusinessDNA;
  onViewFull?: () => void;
}

export function BusinessDNACard({ dna, onViewFull }: BusinessDNACardProps) {
  // Only show if confidence is high enough
  if (dna.confidenceScore < 60) {
    return null;
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-green-500/10 text-green-600 border-green-500/20";
    if (score >= 60)
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  };

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Your Business DNA</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={getConfidenceBadgeColor(dna.confidenceScore)}
          >
            {dna.confidenceScore}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Learning Progress</span>
            <span className={getConfidenceColor(dna.confidenceScore)}>
              {dna.confidenceScore}%
            </span>
          </div>
          <Progress value={dna.confidenceScore} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Analyzed {dna.totalReviews.toLocaleString()} reviews
          </p>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-2 gap-3">
          {/* Top Strength */}
          {dna.strengths && dna.strengths.length > 0 && (
            <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium text-green-600">
                  Top Strength
                </span>
              </div>
              <p className="text-sm font-semibold line-clamp-2">
                {dna.strengths[0]}
              </p>
            </div>
          )}

          {/* Brand Voice */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-blue-600">
                Brand Voice
              </span>
            </div>
            <p className="text-sm font-semibold capitalize">
              {dna.brandVoice || dna.replyStyle.tone}
            </p>
          </div>

          {/* Growth Trend */}
          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3 w-3 text-purple-500" />
              <span className="text-xs font-medium text-purple-600">
                Growth Trend
              </span>
            </div>
            <p className="text-sm font-semibold capitalize">
              {dna.growthTrend}
            </p>
          </div>

          {/* Top Topic */}
          {dna.commonTopics && dna.commonTopics.length > 0 && (
            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-orange-600">
                  Most Mentioned
                </span>
              </div>
              <p className="text-sm font-semibold line-clamp-2">
                {dna.commonTopics[0].topic}
              </p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        {onViewFull && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
            onClick={onViewFull}
          >
            View Full Business Profile
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {/* Insight Message */}
        <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 I use this DNA to personalize every reply to match your unique
            voice and values. The more reviews I analyze, the better I become at
            representing your business!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
