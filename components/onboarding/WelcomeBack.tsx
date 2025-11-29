"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Clock,
  HelpCircle,
  MessageSquare,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WelcomeBackProps {
  userName?: string;
  lastLogin?: string;
  stats?: {
    newReviews?: number;
    newQuestions?: number;
    pendingReplies?: number;
    ratingChange?: number;
  };
  onDismiss: () => void;
  onViewReviews?: () => void;
  onViewQuestions?: () => void;
}

export function WelcomeBack({
  userName,
  lastLogin,
  stats,
  onDismiss,
  onViewReviews,
  onViewQuestions,
}: WelcomeBackProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 10000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUpdates =
    (stats?.newReviews || 0) > 0 ||
    (stats?.newQuestions || 0) > 0 ||
    (stats?.pendingReplies || 0) > 0;

  const timeAway = lastLogin
    ? formatDistanceToNow(new Date(lastLogin), { addSuffix: false })
    : null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed top-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg mx-4"
        >
          <Card className="bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl overflow-hidden">
            {/* Gradient Top Border */}
            <div className="h-1 bg-linear-to-r from-primary via-purple-500 to-pink-500" />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Welcome back{userName ? `, ${userName}` : ""}! 👋
                    </h3>
                    {timeAway && (
                      <p className="text-sm text-muted-foreground">
                        You&apos;ve been away for {timeAway}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(onDismiss, 300);
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Updates Summary */}
              {hasUpdates ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Here&apos;s what happened while you were away:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {(stats?.newReviews || 0) > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        onClick={onViewReviews}
                        className="flex flex-col items-center p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-5 h-5 text-blue-500 mb-1" />
                        <span className="text-2xl font-bold text-blue-500">
                          {stats?.newReviews}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          New Reviews
                        </span>
                      </motion.button>
                    )}

                    {(stats?.newQuestions || 0) > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        onClick={onViewQuestions}
                        className="flex flex-col items-center p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-5 h-5 text-purple-500 mb-1" />
                        <span className="text-2xl font-bold text-purple-500">
                          {stats?.newQuestions}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          New Questions
                        </span>
                      </motion.button>
                    )}

                    {(stats?.pendingReplies || 0) > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        onClick={onViewReviews}
                        className="flex flex-col items-center p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                      >
                        <Clock className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-2xl font-bold text-amber-500">
                          {stats?.pendingReplies}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Need Reply
                        </span>
                      </motion.button>
                    )}
                  </div>

                  {/* Rating Change */}
                  {stats?.ratingChange !== undefined &&
                    stats.ratingChange !== 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          stats.ratingChange > 0
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        <TrendingUp
                          className={`w-4 h-4 ${stats.ratingChange < 0 ? "rotate-180" : ""}`}
                        />
                        <span className="text-sm font-medium">
                          Your rating{" "}
                          {stats.ratingChange > 0 ? "increased" : "decreased"}{" "}
                          by {Math.abs(stats.ratingChange).toFixed(1)} stars
                        </span>
                      </motion.div>
                    )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    ✨ All caught up! No new updates while you were away.
                  </p>
                </div>
              )}

              {/* Action Button */}
              {hasUpdates && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex justify-end"
                >
                  <Button size="sm" onClick={onViewReviews} className="gap-2">
                    View Updates
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="h-0.5 bg-primary/50"
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
