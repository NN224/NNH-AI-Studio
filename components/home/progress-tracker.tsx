"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Trophy,
  Zap,
  Lock,
  Gift,
  Star,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/navigation";
import { useState } from "react";
import confetti from "canvas-confetti";

interface ProgressItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  href?: string;
  icon?: React.ElementType;
  reward?: {
    points: number;
    badge?: string;
  };
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  locked?: boolean;
  dependsOn?: string[];
}

interface ProgressTrackerProps {
  items: ProgressItem[];
  hideWhenComplete?: boolean;
  showRewards?: boolean;
  categories?: string[];
  onComplete?: (itemId: string) => void;
}

export function ProgressTracker({
  items,
  hideWhenComplete = true,
  showRewards = true,
  categories = [],
  onComplete,
}: ProgressTrackerProps) {
  const t = useTranslations("home.progress");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = percentage === 100;

  // Calculate total points earned
  const totalPoints = items
    .filter((item) => item.completed && item.reward)
    .reduce((sum, item) => sum + (item.reward?.points || 0), 0);

  // Group items by category
  const groupedItems =
    categories.length > 0
      ? categories.reduce(
          (acc, category) => {
            acc[category] = items.filter((item) => item.category === category);
            return acc;
          },
          {} as Record<string, ProgressItem[]>,
        )
      : { "All Tasks": items };

  // Check if item is unlocked
  const isUnlocked = (item: ProgressItem): boolean => {
    if (!item.dependsOn || item.dependsOn.length === 0) return true;
    return item.dependsOn.every(
      (depId) => items.find((i) => i.id === depId)?.completed,
    );
  };

  // Trigger confetti on completion
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff6b00", "#ff8c00", "#ffd700"],
    });
  };

  // Hide if complete and hideWhenComplete is true
  if (isComplete && hideWhenComplete) {
    return null;
  }

  // Milestones
  const milestones = [25, 50, 75, 100];
  const currentMilestone = milestones.find(
    (m) => percentage >= m && percentage < m + 25,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-yellow-900/10 backdrop-blur-xl overflow-hidden">
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-yellow-500/5"
          animate={{
            x: [-100, 100, -100],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={isComplete ? { rotate: 360 } : {}}
                transition={{ duration: 1, type: "spring" }}
                className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20"
              >
                {isComplete ? (
                  <Trophy className="h-6 w-6 text-yellow-500" />
                ) : (
                  <Target className="h-6 w-6 text-orange-500" />
                )}
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {isComplete ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-500"
                    >
                      {t("complete")}! 🎉
                    </motion.span>
                  ) : (
                    <span>{t("title")}</span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isComplete ? t("allComplete") : t("subtitle")}
                </p>
              </div>
            </div>

            {/* Toggle & Stats */}
            <div className="flex items-center gap-4">
              {showRewards && totalPoints > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30"
                >
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-500">
                    {totalPoints} pts
                  </span>
                </motion.div>
              )}

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Enhanced Progress Bar with Milestones */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <motion.div
                      key={percentage}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent"
                    >
                      {percentage}%
                    </motion.div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {completedCount}/{totalCount} {t("tasks")}
                      </span>
                      {currentMilestone && (
                        <Badge
                          variant="outline"
                          className="text-xs border-orange-500/30 text-orange-400"
                        >
                          {currentMilestone}% Milestone!
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Progress value={percentage} className="h-3" />
                    {/* Milestone markers */}
                    {milestones.map((milestone) => (
                      <motion.div
                        key={milestone}
                        className={`absolute top-0 h-3 w-0.5 bg-gray-600 ${
                          percentage >= milestone ? "bg-green-500" : ""
                        }`}
                        style={{ left: `${milestone}%` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: milestone / 100 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Task Categories */}
                <div className="space-y-4">
                  {Object.entries(groupedItems).map(
                    ([category, categoryItems], catIndex) => {
                      const categoryCompleted = categoryItems.filter(
                        (item) => item.completed,
                      ).length;
                      const categoryTotal = categoryItems.length;
                      const isExpanded =
                        expandedCategory === category ||
                        categories.length === 0;

                      return (
                        <motion.div
                          key={category}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: catIndex * 0.1 }}
                          className="space-y-3"
                        >
                          {categories.length > 0 && (
                            <button
                              onClick={() =>
                                setExpandedCategory(
                                  isExpanded ? null : category,
                                )
                              }
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {category}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {categoryCompleted}/{categoryTotal}
                                </Badge>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </motion.div>
                            </button>
                          )}

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-2"
                              >
                                {categoryItems.map((item, index) => {
                                  const unlocked = isUnlocked(item);
                                  const Icon = item.icon || Circle;
                                  const showItemDetails =
                                    showDetails === item.id;

                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className={`relative group ${!unlocked ? "opacity-50" : ""}`}
                                    >
                                      <motion.div
                                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                          item.completed
                                            ? "border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/5"
                                            : unlocked
                                              ? "border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-orange-600/5 hover:border-orange-500/50"
                                              : "border-gray-700 bg-gray-900/50"
                                        }`}
                                        onClick={() =>
                                          setShowDetails(
                                            showItemDetails ? null : item.id,
                                          )
                                        }
                                        whileHover={
                                          unlocked ? { scale: 1.02 } : {}
                                        }
                                      >
                                        {/* Task content */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {/* Icon */}
                                            <motion.div
                                              className={`p-2 rounded-lg ${
                                                item.completed
                                                  ? "bg-green-500/20"
                                                  : unlocked
                                                    ? "bg-orange-500/20"
                                                    : "bg-gray-800"
                                              }`}
                                              animate={
                                                item.completed
                                                  ? { rotate: [0, 360] }
                                                  : {}
                                              }
                                              transition={{ duration: 0.5 }}
                                            >
                                              {item.completed ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                              ) : unlocked ? (
                                                <Icon className="h-5 w-5 text-orange-500" />
                                              ) : (
                                                <Lock className="h-5 w-5 text-gray-500" />
                                              )}
                                            </motion.div>

                                            {/* Task info */}
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`text-sm font-medium ${
                                                    item.completed
                                                      ? "text-gray-400 line-through"
                                                      : "text-foreground"
                                                  }`}
                                                >
                                                  {item.label}
                                                </span>
                                                {item.difficulty && (
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs ${
                                                      item.difficulty === "easy"
                                                        ? "border-green-500/30 text-green-400"
                                                        : item.difficulty ===
                                                            "medium"
                                                          ? "border-yellow-500/30 text-yellow-400"
                                                          : "border-red-500/30 text-red-400"
                                                    }`}
                                                  >
                                                    {item.difficulty}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Reward & Action */}
                                          <div className="flex items-center gap-3">
                                            {showRewards && item.reward && (
                                              <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center gap-1"
                                              >
                                                <Zap className="h-4 w-4 text-yellow-500" />
                                                <span className="text-xs text-yellow-500">
                                                  +{item.reward.points}
                                                </span>
                                              </motion.div>
                                            )}

                                            {!item.completed &&
                                              item.href &&
                                              unlocked && (
                                                <Link href={item.href}>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs hover:bg-orange-500/20"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (onComplete) {
                                                        onComplete(item.id);
                                                        if (
                                                          percentage +
                                                            100 / totalCount >=
                                                          100
                                                        ) {
                                                          triggerConfetti();
                                                        }
                                                      }
                                                    }}
                                                  >
                                                    Start
                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                  </Button>
                                                </Link>
                                              )}

                                            {item.completed &&
                                              item.reward?.badge && (
                                                <motion.div
                                                  initial={{
                                                    scale: 0,
                                                    rotate: -180,
                                                  }}
                                                  animate={{
                                                    scale: 1,
                                                    rotate: 0,
                                                  }}
                                                  transition={{
                                                    type: "spring",
                                                    stiffness: 200,
                                                  }}
                                                >
                                                  <span className="text-2xl">
                                                    {item.reward.badge}
                                                  </span>
                                                </motion.div>
                                              )}
                                          </div>
                                        </div>

                                        {/* Expandable description */}
                                        <AnimatePresence>
                                          {showItemDetails &&
                                            item.description && (
                                              <motion.div
                                                initial={{
                                                  height: 0,
                                                  opacity: 0,
                                                }}
                                                animate={{
                                                  height: "auto",
                                                  opacity: 1,
                                                }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-2 pt-2 border-t border-gray-800"
                                              >
                                                <p className="text-xs text-gray-400">
                                                  {item.description}
                                                </p>
                                              </motion.div>
                                            )}
                                        </AnimatePresence>
                                      </motion.div>

                                      {/* Locked overlay message */}
                                      {!unlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="bg-black/80 px-3 py-1 rounded-lg border border-gray-700">
                                            <p className="text-xs text-gray-400">
                                              Complete previous tasks to unlock
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    },
                  )}
                </div>

                {/* Motivation or Celebration */}
                {!isComplete && percentage > 0 && percentage < 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-orange-500" />
                      <p className="text-sm text-orange-400">
                        {percentage >= 75
                          ? "Almost there! Just a few more tasks to complete!"
                          : percentage >= 50
                            ? "Great progress! Keep going, you're doing amazing!"
                            : "You're on your way! Every task completed brings you closer to success!"}
                      </p>
                    </div>
                  </motion.div>
                )}

                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg text-center"
                  >
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-400">
                      Congratulations! You've completed all tasks! 🎉
                    </p>
                    {showRewards && totalPoints > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        You've earned a total of {totalPoints} points!
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
