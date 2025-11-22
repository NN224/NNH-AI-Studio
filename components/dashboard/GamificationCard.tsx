"use client";

import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Achievement {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  progress: number;
  total: number;
}

interface GamificationCardProps {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  achievements: Achievement[];
}

export function GamificationCard({
  level,
  currentXp,
  nextLevelXp,
  achievements,
}: GamificationCardProps) {
  const progressPercentage = (currentXp / nextLevelXp) * 100;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center p-1">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center flex-col">
                <span className="text-xs text-zinc-400">Level</span>
                <span className="text-2xl font-bold text-white">{level}</span>
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] text-zinc-300 border border-zinc-700">
              Visionary
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{currentXp} XP</span>
              <span>{nextLevelXp} XP</span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2 bg-zinc-800"
              indicatorClassName="bg-gradient-to-r from-orange-500 to-yellow-500"
            />
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-300">
            Recent Achievements
          </h4>
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-zinc-800/50 rounded-lg p-3 flex items-start gap-3"
              >
                <div className="p-2 bg-zinc-900 rounded-md border border-zinc-700">
                  {achievement.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h5 className="text-sm font-medium text-zinc-200">
                      {achievement.title}
                    </h5>
                    <span className="text-xs text-zinc-500">
                      {achievement.progress}/{achievement.total}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1">
                    {achievement.description}
                  </p>
                  <Progress
                    value={(achievement.progress / achievement.total) * 100}
                    className="h-1 bg-zinc-700"
                    indicatorClassName="bg-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
