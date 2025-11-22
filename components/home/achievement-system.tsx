"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  Award,
  Star,
  Zap,
  Target,
  TrendingUp,
  Crown,
  Sparkles,
  Gift,
  Lock,
  CheckCircle,
  Heart,
  MessageSquare,
  Clock,
  Users,
  Flame,
  Shield,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "reviews" | "growth" | "engagement" | "special";
  points: number;
  level: "bronze" | "silver" | "gold" | "platinum";
  progress?: number;
  maxProgress?: number;
  unlocked: boolean;
  unlockedAt?: Date;
  reward?: {
    type: "badge" | "feature" | "discount" | "bonus";
    value: string;
  };
}

interface AchievementSystemProps {
  userId: string;
  userPoints?: number;
  userLevel?: number;
  onAchievementUnlock?: (achievement: Achievement) => void;
}

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
  // Reviews achievements
  {
    id: "first-reply",
    name: "First Response",
    description: "Reply to your first review",
    icon: MessageSquare,
    category: "reviews",
    points: 50,
    level: "bronze",
    progress: 1,
    maxProgress: 1,
    unlocked: true,
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Reply to 10 reviews within 1 hour",
    icon: Zap,
    category: "reviews",
    points: 200,
    level: "silver",
    progress: 7,
    maxProgress: 10,
    unlocked: false,
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Reply to 100 reviews",
    icon: Trophy,
    category: "reviews",
    points: 500,
    level: "gold",
    progress: 67,
    maxProgress: 100,
    unlocked: false,
  },

  // Growth achievements
  {
    id: "rising-star",
    name: "Rising Star",
    description: "Achieve 4.5+ average rating",
    icon: Star,
    category: "growth",
    points: 300,
    level: "silver",
    progress: 4.3,
    maxProgress: 4.5,
    unlocked: false,
  },
  {
    id: "growth-master",
    name: "Growth Master",
    description: "Increase reviews by 50% in a month",
    icon: TrendingUp,
    category: "growth",
    points: 750,
    level: "gold",
    progress: 35,
    maxProgress: 50,
    unlocked: false,
  },

  // Engagement achievements
  {
    id: "streak-warrior",
    name: "Streak Warrior",
    description: "Maintain a 30-day login streak",
    icon: Flame,
    category: "engagement",
    points: 400,
    level: "silver",
    progress: 12,
    maxProgress: 30,
    unlocked: false,
  },
  {
    id: "ai-pioneer",
    name: "AI Pioneer",
    description: "Use AI features 100 times",
    icon: Sparkles,
    category: "engagement",
    points: 250,
    level: "bronze",
    progress: 100,
    maxProgress: 100,
    unlocked: true,
    unlockedAt: new Date(),
  },

  // Special achievements
  {
    id: "early-adopter",
    name: "Early Adopter",
    description: "Join during beta period",
    icon: Gift,
    category: "special",
    points: 1000,
    level: "platinum",
    unlocked: true,
    reward: {
      type: "badge",
      value: "Beta Tester",
    },
  },
  {
    id: "perfect-month",
    name: "Perfect Month",
    description: "100% response rate for a full month",
    icon: Crown,
    category: "special",
    points: 1500,
    level: "platinum",
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    reward: {
      type: "feature",
      value: "Premium Analytics",
    },
  },
];

// Level thresholds
const LEVELS = [
  { level: 1, minPoints: 0, maxPoints: 100, name: "Beginner", color: "gray" },
  { level: 2, minPoints: 100, maxPoints: 300, name: "Novice", color: "green" },
  {
    level: 3,
    minPoints: 300,
    maxPoints: 600,
    name: "Apprentice",
    color: "blue",
  },
  {
    level: 4,
    minPoints: 600,
    maxPoints: 1000,
    name: "Professional",
    color: "purple",
  },
  {
    level: 5,
    minPoints: 1000,
    maxPoints: 1500,
    name: "Expert",
    color: "orange",
  },
  { level: 6, minPoints: 1500, maxPoints: 2500, name: "Master", color: "red" },
  {
    level: 7,
    minPoints: 2500,
    maxPoints: 4000,
    name: "Grandmaster",
    color: "yellow",
  },
  {
    level: 8,
    minPoints: 4000,
    maxPoints: 6000,
    name: "Champion",
    color: "pink",
  },
  {
    level: 9,
    minPoints: 6000,
    maxPoints: 10000,
    name: "Legend",
    color: "indigo",
  },
  {
    level: 10,
    minPoints: 10000,
    maxPoints: Infinity,
    name: "Mythic",
    color: "gradient",
  },
];

export function AchievementSystem({
  userId,
  userPoints = 1850,
  userLevel = 5,
  onAchievementUnlock,
}: AchievementSystemProps) {
  const [achievements, setAchievements] = useState(ACHIEVEMENTS);
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState<string | null>(
    null,
  );
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  // Calculate current level data
  const currentLevel = LEVELS.find((l) => l.level === userLevel) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === userLevel + 1);

  // Calculate progress to next level (capped at 100%)
  let levelProgress = 100;
  if (nextLevel) {
    const progress =
      ((userPoints - currentLevel.minPoints) /
        (nextLevel.minPoints - currentLevel.minPoints)) *
      100;
    levelProgress = Math.min(Math.max(progress, 0), 100);
  }

  // Check if user has exceeded next level (should be upgraded)
  const hasExceededNextLevel = nextLevel && userPoints >= nextLevel.minPoints;

  // Filter achievements
  const filteredAchievements = achievements.filter((a) => {
    if (filter === "unlocked") return a.unlocked;
    if (filter === "locked") return !a.unlocked;
    return true;
  });

  // Group achievements by category
  const groupedAchievements = filteredAchievements.reduce(
    (acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    },
    {} as Record<string, Achievement[]>,
  );

  // Handle achievement unlock
  const unlockAchievement = (achievementId: string) => {
    const achievement = achievements.find((a) => a.id === achievementId);
    if (!achievement || achievement.unlocked) return;

    // Update achievement
    setAchievements((prev) =>
      prev.map((a) =>
        a.id === achievementId
          ? { ...a, unlocked: true, unlockedAt: new Date() }
          : a,
      ),
    );

    // Show animation
    setShowUnlockAnimation(achievementId);

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff6b00", "#ffc107", "#4caf50"],
    });

    // Callback
    if (onAchievementUnlock && achievement) {
      onAchievementUnlock({ ...achievement, unlocked: true });
    }

    // Hide animation after delay
    setTimeout(() => setShowUnlockAnimation(null), 3000);
  };

  // Simulate achievement progress (for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      setAchievements((prev) =>
        prev.map((achievement) => {
          if (
            !achievement.unlocked &&
            achievement.progress !== undefined &&
            achievement.maxProgress
          ) {
            const newProgress = Math.min(
              achievement.progress + Math.random() * 2,
              achievement.maxProgress,
            );

            // Check if achievement should be unlocked
            if (newProgress >= achievement.maxProgress) {
              unlockAchievement(achievement.id);
            }

            return { ...achievement, progress: newProgress };
          }
          return achievement;
        }),
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Get category icon and color
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "reviews":
        return { icon: MessageSquare, color: "blue" };
      case "growth":
        return { icon: TrendingUp, color: "green" };
      case "engagement":
        return { icon: Users, color: "purple" };
      case "special":
        return { icon: Crown, color: "orange" };
      default:
        return { icon: Trophy, color: "gray" };
    }
  };

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case "bronze":
        return "orange";
      case "silver":
        return "gray";
      case "gold":
        return "yellow";
      case "platinum":
        return "purple";
      default:
        return "gray";
    }
  };

  return (
    <div className="space-y-6">
      {/* User Level & Points */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/20 via-black to-purple-900/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br",
                  currentLevel.color === "gradient"
                    ? "from-orange-500 via-purple-500 to-pink-500"
                    : `from-${currentLevel.color}-500/20 to-${currentLevel.color}-600/20`,
                  `border-2 border-${currentLevel.color}-500`,
                )}
              >
                <Crown className={`h-8 w-8 text-${currentLevel.color}-500`} />
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold">
                  Level {currentLevel.level}: {currentLevel.name}
                </h2>
                <p className="text-muted-foreground">
                  {userPoints.toLocaleString()} points earned
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Next level</p>
              <p className="text-lg font-semibold">
                {nextLevel
                  ? `${nextLevel.minPoints.toLocaleString()} points`
                  : "Max Level!"}
              </p>
            </div>
          </div>

          {/* Level Progress */}
          {nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentLevel.minPoints.toLocaleString()}</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    hasExceededNextLevel
                      ? "text-green-500"
                      : "text-muted-foreground",
                  )}
                >
                  {hasExceededNextLevel
                    ? "Ready to level up! 🎉"
                    : `${Math.round(levelProgress)}% to next level`}
                </span>
                <span>{nextLevel.minPoints.toLocaleString()}</span>
              </div>
              <Progress
                value={hasExceededNextLevel ? 100 : levelProgress}
                className={cn("h-3", hasExceededNextLevel && "bg-green-500/20")}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["all", "unlocked", "locked"] as const).map((tab) => (
          <Button
            key={tab}
            variant={filter === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab)}
            className={cn(
              filter === tab && "bg-orange-500 hover:bg-orange-600",
            )}
          >
            {tab === "all" && "All"}
            {tab === "unlocked" && "Unlocked"}
            {tab === "locked" && "Locked"}
            {tab !== "all" && (
              <Badge variant="secondary" className="ml-2">
                {
                  achievements.filter((a) =>
                    tab === "unlocked" ? a.unlocked : !a.unlocked,
                  ).length
                }
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="space-y-6">
        {Object.entries(groupedAchievements).map(
          ([category, categoryAchievements]) => {
            const { icon: CategoryIcon, color } = getCategoryStyle(category);

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <CategoryIcon className={`h-5 w-5 text-${color}-500`} />
                  <h3 className="text-lg font-semibold capitalize">
                    {category}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-${color}-500 border-${color}-500/30`}
                  >
                    {categoryAchievements.filter((a) => a.unlocked).length}/
                    {categoryAchievements.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement) => {
                    const Icon = achievement.icon;
                    const levelColor = getLevelColor(achievement.level);
                    const isNearUnlock =
                      achievement.progress &&
                      achievement.maxProgress &&
                      achievement.progress / achievement.maxProgress > 0.8;

                    return (
                      <motion.div
                        key={achievement.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAchievement(achievement)}
                        className="relative group cursor-pointer"
                      >
                        <Card
                          className={cn(
                            "p-4 transition-all",
                            achievement.unlocked
                              ? "border-green-500/30 bg-gradient-to-br from-green-900/10 to-green-800/5"
                              : "border-gray-700 bg-gray-900/50",
                            !achievement.unlocked && "hover:border-gray-600",
                            isNearUnlock &&
                              !achievement.unlocked &&
                              "animate-pulse border-yellow-500/30",
                          )}
                        >
                          {/* Lock overlay */}
                          {!achievement.unlocked && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Lock className="h-8 w-8 text-gray-500" />
                            </div>
                          )}

                          {/* Content */}
                          <div
                            className={cn(
                              "flex items-start gap-3",
                              !achievement.unlocked && "opacity-50",
                            )}
                          >
                            <div
                              className={cn(
                                "p-3 rounded-lg",
                                `bg-${levelColor}-500/20`,
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-6 w-6",
                                  `text-${levelColor}-500`,
                                )}
                              />
                            </div>

                            <div className="flex-1">
                              <h4 className="font-medium">
                                {achievement.name}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {achievement.description}
                              </p>

                              {/* Progress */}
                              {achievement.progress !== undefined &&
                                achievement.maxProgress &&
                                !achievement.unlocked && (
                                  <div className="mt-3">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>
                                        {Math.round(achievement.progress)}/
                                        {achievement.maxProgress}
                                      </span>
                                      <span>
                                        {Math.round(
                                          (achievement.progress /
                                            achievement.maxProgress) *
                                            100,
                                        )}
                                        %
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        (achievement.progress /
                                          achievement.maxProgress) *
                                        100
                                      }
                                      className="h-1"
                                    />
                                  </div>
                                )}

                              {/* Points & Level */}
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="secondary" className="text-xs">
                                  {achievement.points} pts
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs capitalize",
                                    `text-${levelColor}-500 border-${levelColor}-500/30`,
                                  )}
                                >
                                  {achievement.level}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Unlock animation */}
                          <AnimatePresence>
                            {showUnlockAnimation === achievement.id && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-black/90 rounded-lg"
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: 2 }}
                                >
                                  <Trophy className="h-16 w-16 text-yellow-500" />
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          },
        )}
      </div>

      {/* Achievement Detail Modal */}
      <Dialog
        open={!!selectedAchievement}
        onOpenChange={() => setSelectedAchievement(null)}
      >
        <DialogContent className="max-w-md">
          {selectedAchievement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      `bg-${getLevelColor(selectedAchievement.level)}-500/20`,
                    )}
                  >
                    <selectedAchievement.icon
                      className={cn(
                        "h-8 w-8",
                        `text-${getLevelColor(selectedAchievement.level)}-500`,
                      )}
                    />
                  </div>
                  <div>
                    <DialogTitle>{selectedAchievement.name}</DialogTitle>
                    <DialogDescription>
                      {selectedAchievement.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      selectedAchievement.unlocked ? "default" : "outline"
                    }
                  >
                    {selectedAchievement.unlocked ? "Unlocked" : "Locked"}
                  </Badge>
                </div>

                {/* Progress */}
                {selectedAchievement.progress !== undefined &&
                  selectedAchievement.maxProgress && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span>
                          {Math.round(selectedAchievement.progress)}/
                          {selectedAchievement.maxProgress}
                        </span>
                      </div>
                      <Progress
                        value={
                          (selectedAchievement.progress /
                            selectedAchievement.maxProgress) *
                          100
                        }
                      />
                    </div>
                  )}

                {/* Points & Level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reward</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedAchievement.points} points
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        `text-${getLevelColor(selectedAchievement.level)}-500`,
                        `border-${getLevelColor(selectedAchievement.level)}-500/30`,
                      )}
                    >
                      {selectedAchievement.level}
                    </Badge>
                  </div>
                </div>

                {/* Special Reward */}
                {selectedAchievement.reward && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">
                        Special Reward
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedAchievement.reward.type === "badge" &&
                        "Exclusive Badge: "}
                      {selectedAchievement.reward.type === "feature" &&
                        "Unlock Feature: "}
                      {selectedAchievement.reward.type === "discount" &&
                        "Discount: "}
                      {selectedAchievement.reward.type === "bonus" && "Bonus: "}
                      {selectedAchievement.reward.value}
                    </p>
                  </div>
                )}

                {/* Unlock Date */}
                {selectedAchievement.unlocked &&
                  selectedAchievement.unlockedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Unlocked
                      </span>
                      <span className="text-sm">
                        {selectedAchievement.unlockedAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
