"use client";

import { useRealtimeReviews, useRealtimeQuestions } from "@/hooks/use-realtime";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Wifi, WifiOff, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RealtimeConnectionIndicatorProps {
  /** Show detailed status on hover */
  showDetails?: boolean;
  /** Compact mode for header */
  compact?: boolean;
  /** Callback when new data arrives */
  onNewData?: (type: "review" | "question", data: unknown) => void;
}

export function RealtimeConnectionIndicator({
  showDetails = true,
  compact = false,
  onNewData,
}: RealtimeConnectionIndicatorProps) {
  const { user } = useSupabase();
  const [recentEvent, setRecentEvent] = useState<string | null>(null);

  // Handle new review
  const handleNewReview = useCallback(
    (review: unknown) => {
      setRecentEvent("review");
      setTimeout(() => setRecentEvent(null), 3000);
      onNewData?.("review", review);
    },
    [onNewData],
  );

  // Handle new question
  const handleNewQuestion = useCallback(
    (question: unknown) => {
      setRecentEvent("question");
      setTimeout(() => setRecentEvent(null), 3000);
      onNewData?.("question", question);
    },
    [onNewData],
  );

  // Subscribe to realtime updates
  const reviewsStatus = useRealtimeReviews(user?.id, {
    onNewReview: handleNewReview,
    onReviewUpdate: handleNewReview,
    showToasts: true,
  });

  const questionsStatus = useRealtimeQuestions(user?.id, {
    onNewQuestion: handleNewQuestion,
    onQuestionUpdate: handleNewQuestion,
    showToasts: true,
  });

  // Calculate overall connection status
  const isConnected = reviewsStatus.isConnected || questionsStatus.isConnected;
  const hasError = reviewsStatus.error || questionsStatus.error;
  const totalEvents =
    reviewsStatus.eventsReceived + questionsStatus.eventsReceived;

  // Status color and icon
  const statusConfig = hasError
    ? {
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        icon: WifiOff,
        label: "Connection Error",
      }
    : isConnected
      ? {
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          icon: Wifi,
          label: "Live",
        }
      : {
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          icon: Radio,
          label: "Connecting...",
        };

  const StatusIcon = statusConfig.icon;

  // Compact version for header
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all cursor-default",
                statusConfig.bgColor,
                statusConfig.borderColor,
                "border",
              )}
            >
              <StatusIcon className={cn("w-3 h-3", statusConfig.color)} />

              {/* Pulse animation when connected */}
              {isConnected && !hasError && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}

              {/* Event flash */}
              <AnimatePresence>
                {recentEvent && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <div className="font-medium">{statusConfig.label}</div>
              {showDetails && (
                <>
                  <div className="text-muted-foreground">
                    Reviews: {reviewsStatus.isConnected ? "✅" : "⏳"}
                  </div>
                  <div className="text-muted-foreground">
                    Questions: {questionsStatus.isConnected ? "✅" : "⏳"}
                  </div>
                  {totalEvents > 0 && (
                    <div className="text-muted-foreground">
                      Events: {totalEvents}
                    </div>
                  )}
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full version for dashboard
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all",
        statusConfig.bgColor,
        statusConfig.borderColor,
      )}
    >
      <div className="relative">
        <StatusIcon className={cn("w-5 h-5", statusConfig.color)} />

        {/* Pulse animation when connected */}
        {isConnected && !hasError && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
      </div>

      <div className="flex-1">
        <div className={cn("text-sm font-medium", statusConfig.color)}>
          {statusConfig.label}
        </div>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {isConnected
              ? `Listening for updates • ${totalEvents} events`
              : hasError
                ? reviewsStatus.error || questionsStatus.error
                : "Establishing connection..."}
          </div>
        )}
      </div>

      {/* Event flash */}
      <AnimatePresence>
        {recentEvent && (
          <motion.div
            initial={{ scale: 0, x: 20 }}
            animate={{ scale: 1, x: 0 }}
            exit={{ scale: 0, x: 20 }}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-medium"
          >
            <Zap className="w-3 h-3 fill-current" />
            {recentEvent === "review" ? "New Review!" : "New Question!"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
