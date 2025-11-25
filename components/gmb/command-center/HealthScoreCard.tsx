"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  score: number | null;
  status: string;
  statusTone: "success" | "warning" | "danger";
}

export function HealthScoreCard({
  score,
  status,
  statusTone,
}: HealthScoreCardProps) {
  const displayScore = score || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">
              Profile Health
            </CardTitle>
            <CardDescription>Optimization score</CardDescription>
          </div>
          <Badge
            variant={statusTone === "success" ? "default" : "secondary"}
            className={cn(
              statusTone === "success"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-amber-500 hover:bg-amber-600",
            )}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{displayScore}%</span>
            <span className="text-sm text-muted-foreground mb-1">
              optimized
            </span>
          </div>
          <Progress value={displayScore} className="h-2" />

          <div className="flex flex-col gap-2 pt-2">
            {displayScore >= 90 ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Your profile is well optimized!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span>{90 - displayScore}% improvement available</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
