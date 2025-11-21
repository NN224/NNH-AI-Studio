"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Sparkles,
  Brain,
  TrendingUp,
  MessageSquare,
  Star,
  AlertCircle,
  ArrowRight,
  X,
  ChevronRight,
  Target,
  Zap,
  BookOpen,
  PenTool,
  BarChart3,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: string;
  type: "action" | "insight" | "optimization" | "warning" | "tip";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "moderate" | "complex";
  icon?: React.ElementType;
  actionLabel?: string;
  actionUrl?: string;
  onAction?: () => void;
  metrics?: {
    current: number;
    potential: number;
    unit: string;
  };
  steps?: string[];
  dismissed?: boolean;
  completed?: boolean;
}

interface AISuggestionsProps {
  userId?: string;
  businessData?: {
    reviewCount?: number;
    avgRating?: number;
    responseRate?: number;
    lastActivity?: Date;
  };
  onSuggestionComplete?: (suggestionId: string) => void;
}

export function AISuggestions({
  userId,
  businessData,
  onSuggestionComplete,
}: AISuggestionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Generate context-aware suggestions
  const generateSuggestions = useCallback((): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // Review-based suggestions
    if (businessData?.reviewCount && businessData.reviewCount > 0) {
      if (businessData.responseRate && businessData.responseRate < 80) {
        suggestions.push({
          id: "improve-response-rate",
          type: "action",
          title: "Boost Your Response Rate",
          description:
            "You're only responding to " +
            businessData.responseRate +
            "% of reviews. Increasing this can significantly improve customer trust.",
          impact: "high",
          effort: "easy",
          icon: MessageSquare,
          actionLabel: "Start Responding",
          actionUrl: "/reviews?filter=unanswered",
          metrics: {
            current: businessData.responseRate,
            potential: 95,
            unit: "%",
          },
          steps: [
            "Review pending responses",
            "Use AI suggestions for replies",
            "Set up auto-reply for common scenarios",
          ],
        });
      }

      if (businessData.avgRating && businessData.avgRating < 4.5) {
        suggestions.push({
          id: "improve-rating",
          type: "optimization",
          title: "Improve Your Average Rating",
          description:
            "Your current rating is " +
            businessData.avgRating +
            ". Here's how to reach 4.5+ stars.",
          impact: "high",
          effort: "moderate",
          icon: Star,
          actionLabel: "See Strategy",
          onAction: () => {
            router.push("/insights?focus=rating-improvement");
          },
          metrics: {
            current: businessData.avgRating,
            potential: 4.5,
            unit: "stars",
          },
        });
      }
    }

    // Activity-based suggestions
    if (businessData?.lastActivity) {
      const daysSinceActivity = Math.floor(
        (new Date().getTime() - businessData.lastActivity.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceActivity > 7) {
        suggestions.push({
          id: "re-engage",
          type: "warning",
          title: "It's Been a While!",
          description: `You haven't been active for ${daysSinceActivity} days. Regular engagement keeps your business visible.`,
          impact: "medium",
          effort: "easy",
          icon: Clock,
          actionLabel: "Check Activity",
          actionUrl: "/dashboard",
        });
      }
    }

    // Page-specific suggestions
    if (pathname.includes("/home")) {
      suggestions.push({
        id: "complete-profile",
        type: "tip",
        title: "Complete Your Profile",
        description:
          "A complete profile increases visibility by 40% on average.",
        impact: "medium",
        effort: "easy",
        icon: PenTool,
        actionLabel: "Complete Now",
        actionUrl: "/settings/profile",
        steps: [
          "Add business hours",
          "Upload high-quality photos",
          "Write compelling description",
        ],
      });
    }

    // Analytics suggestions
    suggestions.push({
      id: "weekly-insights",
      type: "insight",
      title: "Your Weekly Performance",
      description: "Review response time improved by 25% this week!",
      impact: "low",
      effort: "easy",
      icon: BarChart3,
      actionLabel: "View Full Report",
      actionUrl: "/analytics",
      metrics: {
        current: 2.5,
        potential: 1.5,
        unit: "hours",
      },
    });

    // Optimization suggestions
    suggestions.push({
      id: "enable-auto-reply",
      type: "optimization",
      title: "Enable Smart Auto-Reply",
      description:
        "Save 5+ hours per week with AI-powered automatic responses.",
      impact: "high",
      effort: "easy",
      icon: Zap,
      actionLabel: "Enable Now",
      onAction: () => {
        router.push("/settings/auto-pilot");
      },
    });

    return suggestions;
  }, [businessData, pathname, router]);

  // Load suggestions on mount and when context changes
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSuggestions(generateSuggestions());
      setIsLoading(false);
    }, 1000);
  }, [generateSuggestions]);

  // Refresh suggestions
  const refreshSuggestions = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setSuggestions(generateSuggestions());
      setRefreshing(false);
      toast({
        description: "Suggestions updated!",
      });
    }, 1500);
  };

  // Handle suggestion actions
  const handleSuggestionAction = (suggestion: Suggestion) => {
    if (suggestion.actionUrl) {
      router.push(suggestion.actionUrl);
    } else if (suggestion.onAction) {
      suggestion.onAction();
    }

    // Mark as interacted
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, completed: true } : s)),
    );

    if (onSuggestionComplete) {
      onSuggestionComplete(suggestion.id);
    }
  };

  // Dismiss suggestion
  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, dismissed: true } : s)),
    );
  };

  // Get suggestion color
  const getSuggestionColor = (type: Suggestion["type"]) => {
    switch (type) {
      case "action":
        return "orange";
      case "insight":
        return "blue";
      case "optimization":
        return "purple";
      case "warning":
        return "red";
      case "tip":
        return "green";
      default:
        return "gray";
    }
  };

  // Get impact/effort badge
  const getImpactBadge = (impact: string, effort: string) => {
    const impactColors = {
      high: "text-green-500 border-green-500/30",
      medium: "text-yellow-500 border-yellow-500/30",
      low: "text-gray-500 border-gray-500/30",
    };

    const effortLabels = {
      easy: "Quick Win",
      moderate: "Some Effort",
      complex: "Major Project",
    };

    return {
      impactClass: impactColors[impact as keyof typeof impactColors],
      effortLabel: effortLabels[effort as keyof typeof effortLabels],
    };
  };

  // Filter active suggestions
  const activeSuggestions = suggestions.filter(
    (s) => !s.dismissed && !s.completed,
  );

  if (isLoading) {
    return (
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-purple-900/10">
        <div className="flex items-center gap-3">
          <div className="animate-pulse">
            <Sparkles className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Analyzing your business...
          </p>
        </div>
      </Card>
    );
  }

  if (activeSuggestions.length === 0) {
    return (
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-purple-900/10">
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-medium mb-1">You're All Caught Up!</p>
          <p className="text-sm text-muted-foreground">
            Great job! Check back later for new suggestions.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSuggestions}
            className="mt-4"
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-purple-900/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20"
              >
                <Brain className="h-5 w-5 text-orange-500" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold">AI Suggestions</h3>
                <p className="text-sm text-muted-foreground">
                  {activeSuggestions.length} personalized recommendations
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSuggestions}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="divide-y divide-border/40">
          <AnimatePresence>
            {activeSuggestions.map((suggestion, index) => {
              const Icon = suggestion.icon || Lightbulb;
              const color = getSuggestionColor(suggestion.type);
              const { impactClass, effortLabel } = getImpactBadge(
                suggestion.impact,
                suggestion.effort,
              );
              const isExpanded = activeSuggestion === suggestion.id;

              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div
                    className={cn(
                      "p-6 cursor-pointer transition-colors",
                      "hover:bg-white/5",
                      isExpanded && "bg-white/5",
                    )}
                    onClick={() =>
                      setActiveSuggestion(isExpanded ? null : suggestion.id)
                    }
                  >
                    {/* Glow effect on hover */}
                    <motion.div
                      className={`absolute inset-0 bg-${color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`}
                      initial={false}
                      animate={{ opacity: isExpanded ? 1 : 0 }}
                    />

                    <div className="relative z-10 flex gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                          `bg-${color}-500/10`,
                          isExpanded && "scale-110 transition-transform",
                        )}
                      >
                        <Icon className={cn("h-6 w-6", `text-${color}-500`)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        {/* Title & Badges */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-medium">{suggestion.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", impactClass)}
                            >
                              {suggestion.impact} impact
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {effortLabel}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-3">
                          {suggestion.description}
                        </p>

                        {/* Metrics */}
                        {suggestion.metrics && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{
                              opacity: isExpanded ? 1 : 0,
                              height: isExpanded ? "auto" : 0,
                            }}
                            className="overflow-hidden"
                          >
                            <div className="mb-4 p-3 bg-black/30 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground">
                                  Potential improvement
                                </span>
                                <span className="text-sm font-medium text-green-500">
                                  +
                                  {Math.round(
                                    ((suggestion.metrics.potential -
                                      suggestion.metrics.current) /
                                      suggestion.metrics.current) *
                                      100,
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span>
                                    Current: {suggestion.metrics.current}
                                    {suggestion.metrics.unit}
                                  </span>
                                  <span>
                                    Goal: {suggestion.metrics.potential}
                                    {suggestion.metrics.unit}
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    (suggestion.metrics.current /
                                      suggestion.metrics.potential) *
                                    100
                                  }
                                  className="h-2"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Steps */}
                        {suggestion.steps && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{
                              opacity: isExpanded ? 1 : 0,
                              height: isExpanded ? "auto" : 0,
                            }}
                            className="overflow-hidden"
                          >
                            <div className="mb-4">
                              <p className="text-xs text-muted-foreground mb-2">
                                How to get there:
                              </p>
                              <div className="space-y-2">
                                {suggestion.steps.map((step, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                    className="flex items-center gap-2"
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-full bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}
                                    >
                                      <span
                                        className={`text-xs text-${color}-500`}
                                      >
                                        {idx + 1}
                                      </span>
                                    </div>
                                    <span className="text-sm">{step}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {suggestion.actionLabel && (
                            <Button
                              size="sm"
                              className={cn(
                                "bg-gradient-to-r",
                                color === "orange" &&
                                  "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
                                color === "blue" &&
                                  "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
                                color === "purple" &&
                                  "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
                                color === "red" &&
                                  "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
                                color === "green" &&
                                  "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuggestionAction(suggestion);
                              }}
                            >
                              {suggestion.actionLabel}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissSuggestion(suggestion.id);
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>

                      {/* Expand/Collapse indicator */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
