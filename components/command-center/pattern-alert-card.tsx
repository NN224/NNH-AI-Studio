"use client";

/**
 * ⚠️ PATTERN ALERT CARD
 *
 * Displays detected patterns from the pattern detection service.
 * Shows proactive insights about recurring issues or trends.
 */

import {
  AlertTriangle,
  TrendingUp,
  Clock,
  MapPin,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PatternType =
  | "complaint_cluster"
  | "day_time_pattern"
  | "rating_trend"
  | "service_quality"
  | "product_quality"
  | "positive_trend";

export interface DetectedPattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  affectedCount: number;
  detectedAt: string;
  keywords?: string[];
  suggestion?: string;
}

export interface PatternAlertCardProps {
  patterns: DetectedPattern[];
  onViewAll?: () => void;
  onDismiss?: (patternId: string) => void;
}

export function PatternAlertCard({
  patterns,
  onViewAll,
  onDismiss,
}: PatternAlertCardProps) {
  // Don't show if no patterns
  if (!patterns || patterns.length === 0) {
    return null;
  }

  // Sort by severity and take top 2
  const sortedPatterns = [...patterns]
    .sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })
    .slice(0, 2);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getPatternIcon = (type: PatternType) => {
    switch (type) {
      case "complaint_cluster":
        return <AlertTriangle className="h-4 w-4" />;
      case "day_time_pattern":
        return <Clock className="h-4 w-4" />;
      case "rating_trend":
        return <TrendingUp className="h-4 w-4" />;
      case "service_quality":
        return <MessageSquare className="h-4 w-4" />;
      case "product_quality":
        return <MapPin className="h-4 w-4" />;
      case "positive_trend":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "high":
        return "🔴 High Priority";
      case "medium":
        return "🟡 Medium Priority";
      case "low":
        return "🟢 Low Priority";
      default:
        return severity;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Pattern Detected</CardTitle>
          </div>
          <Badge
            variant="outline"
            className="bg-orange-500/10 text-orange-600 border-orange-500/20"
          >
            {patterns.length} {patterns.length === 1 ? "Pattern" : "Patterns"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPatterns.map((pattern) => (
          <div
            key={pattern.id}
            className={`p-4 border rounded-lg ${getSeverityColor(pattern.severity)}`}
          >
            {/* Pattern Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getPatternIcon(pattern.type)}
                <div>
                  <h4 className="text-sm font-semibold">{pattern.title}</h4>
                  <p className="text-xs opacity-80">
                    {getSeverityLabel(pattern.severity)} • {pattern.confidence}%
                    confidence
                  </p>
                </div>
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDismiss(pattern.id)}
                >
                  ×
                </Button>
              )}
            </div>

            {/* Pattern Description */}
            <p className="text-sm mb-2">{pattern.description}</p>

            {/* Pattern Details */}
            <div className="flex items-center gap-4 text-xs opacity-80 mb-2">
              <span>{pattern.affectedCount} reviews affected</span>
              <span>
                Detected{" "}
                {new Date(pattern.detectedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Keywords */}
            {pattern.keywords && pattern.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {pattern.keywords.slice(0, 3).map((keyword, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs bg-white/10"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}

            {/* Suggestion */}
            {pattern.suggestion && (
              <div className="p-2 bg-white/10 rounded text-xs mt-2">
                <span className="font-medium">💡 Suggestion: </span>
                {pattern.suggestion}
              </div>
            )}
          </div>
        ))}

        {/* View All Button */}
        {patterns.length > 2 && onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
            onClick={onViewAll}
          >
            View All {patterns.length} Patterns
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {/* Info Message */}
        <div className="p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            🔍 I continuously analyze your reviews to spot patterns and trends.
            This helps you stay ahead of issues before they become bigger
            problems!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
