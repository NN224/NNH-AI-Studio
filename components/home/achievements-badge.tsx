"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Star,
  Target,
  Zap,
  Award,
  Medal,
  Crown,
  Flame,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  points: number;
}

// TODO: Replace with real achievements data from API/Database
// For now, using empty array - connect to backend achievements system
const achievements: Achievement[] = [
  // Example structure - replace with real data:
  // {
  //   id: "first-review",
  //   title: "First Steps",
  //   description: "Reply to your first review",
  //   icon: MessageSquare,
  //   unlocked: false,
  //   progress: 0,
  //   maxProgress: 1,
  //   rarity: "common",
  //   points: 10,
  // },
];

const getRarityColor = (rarity: Achievement["rarity"]) => {
  const colors = {
    common: {
      bg: "bg-gray-500/10",
      border: "border-gray-500/30",
      text: "text-gray-400",
    },
    rare: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
    },
    epic: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
    },
    legendary: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
    },
  };
  return colors[rarity];
};

export function AchievementsBadge() {
  const [showAll, setShowAll] = useState(false);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalPoints = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-3 bg-orange-500/20 rounded-lg"
              >
                <Trophy className="h-6 w-6 text-orange-500" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-lg">Achievements</h3>
                <p className="text-sm text-muted-foreground">
                  {unlockedCount}/{achievements.length} unlocked • {totalPoints}{" "}
                  points
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => setShowAll(!showAll)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-orange-500 hover:text-orange-400"
            >
              {showAll ? "Show Less" : "View All"}
            </motion.button>
          </div>
        </Card>
      </motion.div>

      {/* Achievement Grid */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            {achievements.map((achievement, index) => {
              const colors = getRarityColor(achievement.rarity);
              const Icon = achievement.icon;

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative"
                >
                  <Card
                    className={`p-4 border ${colors.border} ${colors.bg} ${achievement.unlocked ? "" : "opacity-50"} relative overflow-hidden group cursor-pointer`}
                  >
                    {/* Unlock glow effect */}
                    {achievement.unlocked && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    <div className="relative z-10 text-center space-y-2">
                      <div
                        className={`mx-auto w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center`}
                      >
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                      </div>

                      <div>
                        <p className="font-semibold text-xs line-clamp-1">
                          {achievement.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {achievement.description}
                        </p>
                      </div>

                      {/* Progress bar */}
                      {achievement.progress !== undefined &&
                        achievement.maxProgress && (
                          <div className="space-y-1">
                            <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-orange-500"
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                                }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {achievement.progress}/{achievement.maxProgress}
                            </p>
                          </div>
                        )}

                      {/* Points */}
                      <Badge variant="outline" className="text-xs">
                        +{achievement.points} pts
                      </Badge>
                    </div>

                    {/* Unlocked badge */}
                    {achievement.unlocked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick achievements preview */}
      {!showAll && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {achievements
            .filter((a) => a.unlocked)
            .slice(0, 4)
            .map((achievement, index) => {
              const Icon = achievement.icon;
              const colors = getRarityColor(achievement.rarity);

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center relative group cursor-pointer`}
                >
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                  <div className="absolute -top-1 -right-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}
