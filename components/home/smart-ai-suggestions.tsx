"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { aiLogger } from "@/lib/utils/logger";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SmartSuggestion {
  id: string;
  type: "action" | "insight" | "optimization" | "warning";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionLabel: string;
  actionUrl: string;
  icon: React.ElementType;
  color: string;
}

interface SmartAISuggestionsProps {
  userId: string;
  pendingReviews?: number;
  responseRate?: number;
  avgRating?: number;
  totalReviews?: number;
  weeklyGrowth?: number;
  hasAutoReply?: boolean;
  profileComplete?: boolean;
}

export function SmartAISuggestions({
  userId,
  pendingReviews = 0,
  responseRate = 0,
  avgRating = 0,
  totalReviews = 0,
  weeklyGrowth = 0,
  hasAutoReply = false,
  // profileComplete - reserved for future use
}: SmartAISuggestionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load dismissed suggestions from Database
  useEffect(() => {
    const loadDismissed = async () => {
      try {
        if (!supabase) {
          throw new Error("Supabase client not initialized");
        }

        const { data, error } = await supabase
          .from("user_suggestion_actions")
          .select("suggestion_id")
          .eq("user_id", userId)
          .eq("action_type", "dismissed");

        if (error) throw error;

        if (data) {
          setDismissedIds(data.map((d) => d.suggestion_id));
        }
      } catch (err) {
        aiLogger.error(
          "Failed to load dismissed suggestions",
          err instanceof Error ? err : new Error(String(err)),
        );
        // Fallback to localStorage
        const stored = localStorage.getItem(`dismissed_suggestions_${userId}`);
        if (stored) {
          try {
            setDismissedIds(JSON.parse(stored));
          } catch {
            // Invalid JSON in localStorage - ignore
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDismissed();
  }, [userId, supabase]);

  // Generate SMART suggestions based on REAL data
  const generateSmartSuggestions = (): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // 1. Pending Reviews - HIGH PRIORITY
    if (pendingReviews > 0) {
      suggestions.push({
        id: "pending-reviews",
        type: "action",
        title: `${pendingReviews} Reviews Waiting`,
        description: `You have ${pendingReviews} review${pendingReviews > 1 ? "s" : ""} waiting for your response. Quick responses improve customer trust.`,
        impact: "high",
        actionLabel: "Reply Now",
        actionUrl: "/reviews?filter=pending",
        icon: MessageSquare,
        color: "blue",
      });
    }

    // 2. Low Response Rate
    if (responseRate < 80 && totalReviews > 0) {
      suggestions.push({
        id: "low-response-rate",
        type: "optimization",
        title: "Improve Response Rate",
        description: `Your response rate is ${responseRate}%. Aim for 90%+ to build customer trust.`,
        impact: "high",
        actionLabel: "View Pending",
        actionUrl: "/reviews?filter=unanswered",
        icon: BarChart3,
        color: "orange",
      });
    }

    // 3. Enable Auto-Reply (if not enabled)
    if (!hasAutoReply && totalReviews > 10) {
      suggestions.push({
        id: "enable-auto-reply",
        type: "optimization",
        title: "Enable Smart Auto-Reply",
        description:
          "Save time with AI-powered automatic responses to common reviews.",
        impact: "high",
        actionLabel: "Enable Now",
        actionUrl: "/settings/auto-pilot",
        icon: Zap,
        color: "purple",
      });
    }

    // 4. Rating Improvement
    if (avgRating > 0 && avgRating < 4.5) {
      suggestions.push({
        id: "improve-rating",
        type: "insight",
        title: "Boost Your Rating",
        description: `Your rating is ${avgRating.toFixed(1)}⭐. Responding to negative reviews can help improve it.`,
        impact: "medium",
        actionLabel: "See Strategy",
        actionUrl: "/analytics?tab=rating",
        icon: Star,
        color: "yellow",
      });
    }

    // 5. Weekly Growth (positive insight)
    if (weeklyGrowth > 0) {
      suggestions.push({
        id: "weekly-growth",
        type: "insight",
        title: `+${weeklyGrowth}% This Week!`,
        description: `Great job! Your reviews grew by ${weeklyGrowth}% compared to last week.`,
        impact: "low",
        actionLabel: "View Report",
        actionUrl: "/analytics",
        icon: BarChart3,
        color: "green",
      });
    }

    // 6. No activity warning
    if (totalReviews === 0) {
      suggestions.push({
        id: "get-started",
        type: "warning",
        title: "Get Your First Review",
        description:
          "Connect your Google Business Profile to start managing reviews.",
        impact: "high",
        actionLabel: "Connect Now",
        actionUrl: "/settings/connections",
        icon: Clock,
        color: "orange",
      });
    }

    return suggestions;
  };

  // Dismiss a suggestion - Save to Database
  const dismissSuggestion = async (id: string) => {
    // Optimistic update
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);

    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { error } = await supabase.from("user_suggestion_actions").upsert({
        user_id: userId,
        suggestion_id: id,
        action_type: "dismissed",
      });

      if (error) throw error;

      toast({ description: "Suggestion dismissed" });
    } catch (err) {
      aiLogger.error(
        "Failed to dismiss suggestion",
        err instanceof Error ? err : new Error(String(err)),
      );
      // Fallback to localStorage
      localStorage.setItem(
        `dismissed_suggestions_${userId}`,
        JSON.stringify(newDismissed),
      );
      toast({ description: "Suggestion dismissed (offline)" });
    }
  };

  // Handle action click - Track in Database
  const handleAction = async (suggestion: SmartSuggestion) => {
    // Track the click (fire and forget)
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      await supabase.from("user_suggestion_actions").upsert({
        user_id: userId,
        suggestion_id: suggestion.id,
        action_type: "clicked",
      });
    } catch (err) {
      aiLogger.error(
        "Failed to track click",
        err instanceof Error ? err : new Error(String(err)),
      );
    }

    router.push(suggestion.actionUrl);
  };

  // Refresh suggestions
  const refreshSuggestions = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast({ description: "Suggestions updated!" });
    }, 500);
  };

  // Filter out dismissed suggestions and limit to 2
  const activeSuggestions = generateSmartSuggestions()
    .filter((s) => !dismissedIds.includes(s.id))
    .slice(0, 2);

  // Get color classes
  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-500/10`,
    border: `border-${color}-500/20`,
    text: `text-${color}-500`,
    hover: `hover:bg-${color}-500/20`,
  });

  if (isLoading) {
    return (
      <Card className="p-6 border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Loading suggestions...
          </p>
        </div>
      </Card>
    );
  }

  if (activeSuggestions.length === 0) {
    return (
      <Card className="p-6 border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              No suggestions right now.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      data-tour="ai-suggestions"
      className="border-border/50 bg-card/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Suggestions</h3>
            <p className="text-xs text-muted-foreground">
              {activeSuggestions.length} personalized recommendation
              {activeSuggestions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshSuggestions}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-border/50">
        <AnimatePresence>
          {activeSuggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            const colors = getColorClasses(suggestion.color);

            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4"
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={cn("shrink-0 p-2.5 rounded-xl", colors.bg)}>
                    <Icon className={cn("h-5 w-5", colors.text)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">
                        {suggestion.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            suggestion.impact === "high" &&
                              "border-red-500/50 text-red-500",
                            suggestion.impact === "medium" &&
                              "border-yellow-500/50 text-yellow-500",
                            suggestion.impact === "low" &&
                              "border-green-500/50 text-green-500",
                          )}
                        >
                          {suggestion.impact} impact
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                      {suggestion.description}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className={cn(
                          "h-8 text-xs gap-1",
                          colors.bg,
                          colors.text,
                          colors.hover,
                        )}
                        variant="ghost"
                        onClick={() => handleAction(suggestion)}
                      >
                        {suggestion.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => dismissSuggestion(suggestion.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}
