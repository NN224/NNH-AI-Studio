"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getUserProgress,
  getUserAchievements,
  updateUserAchievements,
  initializeUserProgress,
  type UserProgress,
  type UserAchievement,
} from "@/server/actions/achievements";
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

interface AchievementSystemProps {
  userId: string;
  initialProgress?: UserProgress | null;
  initialAchievements?: UserAchievement[];
  onAchievementUnlock?: (achievement: UserAchievement) => void;
}

type LevelColorKey =
  | "gray"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "red"
  | "yellow"
  | "pink"
  | "indigo"
  | "gradient";

const LEVEL_COLOR_CLASSES: Record<
  LevelColorKey,
  { bg: string; border: string; text: string }
> = {
  gray: {
    bg: "from-gray-500/20 to-gray-600/20",
    border: "border-gray-500",
    text: "text-gray-500",
  },
  green: {
    bg: "from-green-500/20 to-green-600/20",
    border: "border-green-500",
    text: "text-green-500",
  },
  blue: {
    bg: "from-blue-500/20 to-blue-600/20",
    border: "border-blue-500",
    text: "text-blue-500",
  },
  purple: {
    bg: "from-purple-500/20 to-purple-600/20",
    border: "border-purple-500",
    text: "text-purple-500",
  },
  orange: {
    bg: "from-orange-500/20 to-orange-600/20",
    border: "border-orange-500",
    text: "text-orange-500",
  },
  red: {
    bg: "from-red-500/20 to-red-600/20",
    border: "border-red-500",
    text: "text-red-500",
  },
  yellow: {
    bg: "from-yellow-500/20 to-yellow-600/20",
    border: "border-yellow-500",
    text: "text-yellow-500",
  },
  pink: {
    bg: "from-pink-500/20 to-pink-600/20",
    border: "border-pink-500",
    text: "text-pink-500",
  },
  indigo: {
    bg: "from-indigo-500/20 to-indigo-600/20",
    border: "border-indigo-500",
    text: "text-indigo-500",
  },
  gradient: {
    bg: "from-orange-500 via-purple-500 to-pink-500",
    border: "border-orange-500",
    text: "text-orange-500",
  },
};

// Level thresholds
const LEVELS = [
  {
    level: 1,
    minPoints: 0,
    maxPoints: 100,
    name: "Beginner",
    color: "gray" as LevelColorKey,
  },
  {
    level: 2,
    minPoints: 100,
    maxPoints: 300,
    name: "Novice",
    color: "green" as LevelColorKey,
  },
  {
    level: 3,
    minPoints: 300,
    maxPoints: 600,
    name: "Apprentice",
    color: "blue" as LevelColorKey,
  },
  {
    level: 4,
    minPoints: 600,
    maxPoints: 1000,
    name: "Professional",
    color: "purple" as LevelColorKey,
  },
  {
    level: 5,
    minPoints: 1000,
    maxPoints: 1500,
    name: "Expert",
    color: "orange" as LevelColorKey,
  },
  {
    level: 6,
    minPoints: 1500,
    maxPoints: 2500,
    name: "Master",
    color: "red" as LevelColorKey,
  },
  {
    level: 7,
    minPoints: 2500,
    maxPoints: 4000,
    name: "Grandmaster",
    color: "yellow" as LevelColorKey,
  },
  {
    level: 8,
    minPoints: 4000,
    maxPoints: 6000,
    name: "Champion",
    color: "pink" as LevelColorKey,
  },
  {
    level: 9,
    minPoints: 6000,
    maxPoints: 10000,
    name: "Legend",
    color: "indigo" as LevelColorKey,
  },
  {
    level: 10,
    minPoints: 10000,
    maxPoints: Infinity,
    name: "Mythic",
    color: "gradient" as LevelColorKey,
  },
];

export function AchievementSystem({
  userId,
  initialProgress,
  initialAchievements = [],
  onAchievementUnlock,
}: AchievementSystemProps) {
  const [progress, setProgress] = useState<UserProgress | null>(
    initialProgress || null,
  );
  const [achievements, setAchievements] =
    useState<UserAchievement[]>(initialAchievements);
  const [selectedAchievement, setSelectedAchievement] =
    useState<UserAchievement | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState<string | null>(
    null,
  );
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [loading, setLoading] = useState(
    !initialProgress || initialAchievements.length === 0,
  );

  const userPoints = progress?.total_points || 0;
  const userLevel = progress?.current_level || 1;

  // Calculate current level data
  const currentLevel = LEVELS.find((l) => l.level === userLevel) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === userLevel + 1);
  const currentLevelColors = LEVEL_COLOR_CLASSES[currentLevel.color];

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
    {} as Record<string, UserAchievement[]>,
  );

  // Debug logging
  useEffect(() => {
    console.log("[AchievementSystem] Current state:", {
      progress,
      achievementsCount: achievements.length,
      filteredCount: filteredAchievements.length,
      groupedCount: Object.keys(groupedAchievements).length,
      loading,
    });
  }, [progress, achievements, filter, loading]);

  // Handle achievement unlock
  const unlockAchievement = (achievementId: string) => {
    const achievement = achievements.find(
      (a) => a.achievement_id === achievementId,
    );
    if (!achievement || achievement.unlocked) return;

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
      onAchievementUnlock(achievement);
    }

    // Hide animation after delay
    setTimeout(() => setShowUnlockAnimation(null), 3000);
  };

  // Load achievements on mount
  useEffect(() => {
    async function loadData() {
      if (!initialProgress || initialAchievements.length === 0) {
        try {
          const [progressData, achievementsData] = await Promise.all([
            getUserProgress(),
            getUserAchievements("all"),
          ]);

          console.log("[AchievementSystem] Loaded data:", {
            progress: progressData,
            achievementsCount: achievementsData?.length || 0,
            achievements: achievementsData,
          });

          if (progressData) setProgress(progressData);
          if (achievementsData) setAchievements(achievementsData);
        } catch (error) {
          console.error("Error loading achievements:", error);
        } finally {
          setLoading(false);
        }
      } else {
        // Data already provided, just stop loading
        setLoading(false);
        console.log("[AchievementSystem] Using initial data:", {
          progress: initialProgress,
          achievementsCount: initialAchievements.length,
        });
      }
    }

    loadData();
  }, [initialProgress, initialAchievements]);

  // Update achievements periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await updateUserAchievements();
        const [progressData, achievementsData] = await Promise.all([
          getUserProgress(),
          getUserAchievements("all"),
        ]);

        if (progressData) setProgress(progressData);
        if (achievementsData) setAchievements(achievementsData);
      } catch (error) {
        console.error("Error updating achievements:", error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get category icon and color
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "reviews":
        return {
          icon: MessageSquare,
          label: "Reviews",
          iconClass: "text-blue-500",
          badgeClass: "text-blue-500 border-blue-500/30",
        };
      case "growth":
        return {
          icon: TrendingUp,
          label: "Growth",
          iconClass: "text-green-500",
          badgeClass: "text-green-500 border-green-500/30",
        };
      case "engagement":
        return {
          icon: Users,
          label: "Engagement",
          iconClass: "text-purple-500",
          badgeClass: "text-purple-500 border-purple-500/30",
        };
      case "special":
        return {
          icon: Crown,
          label: "Special",
          iconClass: "text-orange-500",
          badgeClass: "text-orange-500 border-orange-500/30",
        };
      default:
        return {
          icon: Trophy,
          label: "Other",
          iconClass: "text-gray-400",
          badgeClass: "text-gray-400 border-gray-500/30",
        };
    }
  };

  // Get achievement icon
  const getAchievementIcon = (achievementId: string) => {
    switch (achievementId) {
      case "first-reply":
        return MessageSquare;
      case "speed-demon":
        return Zap;
      case "centurion":
        return Trophy;
      case "rising-star":
        return Star;
      case "growth-master":
        return TrendingUp;
      case "streak-warrior":
        return Flame;
      case "ai-pioneer":
        return Sparkles;
      case "early-adopter":
        return Gift;
      case "perfect-month":
        return Crown;
      default:
        return Medal;
    }
  };

  // Get level color classes for achievement cards
  const getLevelColorClasses = (level: string) => {
    switch (level) {
      case "bronze":
        return {
          bg: "bg-orange-500/20",
          text: "text-orange-500",
          border: "text-orange-500 border-orange-500/30",
        };
      case "silver":
        return {
          bg: "bg-gray-500/20",
          text: "text-gray-300",
          border: "text-gray-300 border-gray-500/30",
        };
      case "gold":
        return {
          bg: "bg-yellow-500/20",
          text: "text-yellow-400",
          border: "text-yellow-400 border-yellow-500/30",
        };
      case "platinum":
        return {
          bg: "bg-purple-500/20",
          text: "text-purple-400",
          border: "text-purple-400 border-purple-500/30",
        };
      default:
        return {
          bg: "bg-gray-500/20",
          text: "text-gray-300",
          border: "text-gray-300 border-gray-500/30",
        };
    }
  };

  if (loading) {
    return (
      <div className="achievements space-y-6">
        <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/20 via-black to-purple-900/20 backdrop-blur-xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </Card>
      </div>
    );
  }

  // Empty state: no progress or achievements
  if (!progress && achievements.length === 0) {
    return (
      <div className="achievements space-y-6">
        <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/20 via-black to-purple-900/20 backdrop-blur-xl">
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-orange-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Progress Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start using the platform to earn achievements and level up!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await initializeUserProgress();
                await updateUserAchievements();
                const [progressData, achievementsData] = await Promise.all([
                  getUserProgress(),
                  getUserAchievements("all"),
                ]);
                if (progressData) setProgress(progressData);
                if (achievementsData) setAchievements(achievementsData);
              }}
            >
              Initialize Progress
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="achievements space-y-6">
      {/* Your Progress - Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/20 via-black to-purple-900/20 backdrop-blur-xl">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-orange-500" />
              Your Progress
            </h2>

            {/* User Level & Points */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br",
                    currentLevelColors.bg,
                    "border-2",
                    currentLevelColors.border,
                  )}
                >
                  <Crown className={cn("h-8 w-8", currentLevelColors.text)} />
                </motion.div>

                <div>
                  <h3 className="text-xl font-bold">
                    Level {currentLevel.level}: {currentLevel.name}
                  </h3>
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
                  <span className="text-muted-foreground">
                    {currentLevel.minPoints.toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      hasExceededNextLevel
                        ? "text-green-500 font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    {hasExceededNextLevel
                      ? "Ready to level up! 🎉"
                      : `${Math.round(levelProgress)}% to next level`}
                  </span>
                  <span className="text-muted-foreground">
                    {nextLevel.minPoints.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={hasExceededNextLevel ? 100 : levelProgress}
                  className={cn(
                    "h-3",
                    hasExceededNextLevel && "bg-green-500/20",
                  )}
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/40 my-6" />

          {/* Filter Tabs */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">
              Filter Achievements
            </p>
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
          </div>

          {/* Divider */}
          <div className="border-t border-border/40 my-6" />

          {/* Achievements Grid */}
          <div className="space-y-6">
            {Object.keys(groupedAchievements).length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-orange-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  No Achievements Yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Achievements will appear here as you use the platform.
                </p>
              </div>
            ) : (
              Object.entries(groupedAchievements).map(
                ([category, categoryAchievements]) => {
                  const {
                    icon: CategoryIcon,
                    label,
                    iconClass,
                    badgeClass,
                  } = getCategoryStyle(category);

                  return (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <CategoryIcon className={cn("h-5 w-5", iconClass)} />
                        <h3 className="text-lg font-semibold capitalize">
                          {label}
                        </h3>
                        <Badge variant="outline" className={badgeClass}>
                          {
                            categoryAchievements.filter((a) => a.unlocked)
                              .length
                          }
                          /{categoryAchievements.length}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryAchievements.map((achievement) => {
                          const Icon = getAchievementIcon(
                            achievement.achievement_id,
                          );
                          const levelClasses = getLevelColorClasses(
                            achievement.level,
                          );
                          const isNearUnlock =
                            achievement.progress &&
                            achievement.max_progress &&
                            achievement.progress / achievement.max_progress >
                              0.8;

                          return (
                            <motion.div
                              key={achievement.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() =>
                                setSelectedAchievement(achievement)
                              }
                              className="relative group cursor-pointer"
                            >
                              <Card
                                className={cn(
                                  "p-4 transition-all",
                                  achievement.unlocked
                                    ? "border-green-500/30 bg-gradient-to-br from-green-900/10 to-green-800/5"
                                    : "border-gray-700 bg-gray-900/50",
                                  !achievement.unlocked &&
                                    "hover:border-gray-600",
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
                                      levelClasses.bg,
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        "h-6 w-6",
                                        levelClasses.text,
                                      )}
                                    />
                                  </div>

                                  <div className="flex-1">
                                    <h4 className="font-medium">
                                      {achievement.achievement_name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {achievement.achievement_description}
                                    </p>

                                    {/* Progress */}
                                    {achievement.progress !== undefined &&
                                      achievement.max_progress &&
                                      !achievement.unlocked && (
                                        <div className="mt-3">
                                          <div className="flex justify-between text-xs mb-1">
                                            <span>
                                              {Math.round(achievement.progress)}
                                              /{achievement.max_progress}
                                            </span>
                                            <span>
                                              {Math.round(
                                                (achievement.progress /
                                                  achievement.max_progress) *
                                                  100,
                                              )}
                                              %
                                            </span>
                                          </div>
                                          <Progress
                                            value={
                                              (achievement.progress /
                                                achievement.max_progress) *
                                              100
                                            }
                                            className="h-1"
                                          />
                                        </div>
                                      )}

                                    {/* Points & Level */}
                                    <div className="flex items-center gap-2 mt-3">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {achievement.points} pts
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-xs capitalize",
                                          levelClasses.border,
                                        )}
                                      >
                                        {achievement.level}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Unlock animation */}
                                <AnimatePresence>
                                  {showUnlockAnimation ===
                                    achievement.achievement_id && (
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
              )
            )}
          </div>
        </Card>
      </motion.div>

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
                      getLevelColorClasses(selectedAchievement.level).bg,
                    )}
                  >
                    {(() => {
                      const Icon = getAchievementIcon(
                        selectedAchievement.achievement_id,
                      );
                      return (
                        <Icon
                          className={cn(
                            "h-8 w-8",
                            getLevelColorClasses(selectedAchievement.level)
                              .text,
                          )}
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <DialogTitle>
                      {selectedAchievement.achievement_name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedAchievement.achievement_description}
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
                  selectedAchievement.max_progress && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span>
                          {Math.round(selectedAchievement.progress)}/
                          {selectedAchievement.max_progress}
                        </span>
                      </div>
                      <Progress
                        value={
                          (selectedAchievement.progress /
                            selectedAchievement.max_progress) *
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
                        getLevelColorClasses(selectedAchievement.level).border,
                      )}
                    >
                      {selectedAchievement.level}
                    </Badge>
                  </div>
                </div>

                {/* Special Reward */}
                {selectedAchievement.reward_type &&
                  selectedAchievement.reward_value && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Gift className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">
                          Special Reward
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedAchievement.reward_type === "badge" &&
                          "Exclusive Badge: "}
                        {selectedAchievement.reward_type === "feature" &&
                          "Unlock Feature: "}
                        {selectedAchievement.reward_type === "discount" &&
                          "Discount: "}
                        {selectedAchievement.reward_type === "bonus" &&
                          "Bonus: "}
                        {selectedAchievement.reward_value}
                      </p>
                    </div>
                  )}

                {/* Unlock Date */}
                {selectedAchievement.unlocked &&
                  selectedAchievement.unlocked_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Unlocked
                      </span>
                      <span className="text-sm">
                        {new Date(
                          selectedAchievement.unlocked_at,
                        ).toLocaleDateString()}
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
