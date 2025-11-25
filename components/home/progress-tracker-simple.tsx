"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/navigation";
import { useState } from "react";

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
  points?: number;
}

interface SimpleProgressTrackerProps {
  items: ProgressItem[];
  hideWhenComplete?: boolean;
}

export function SimpleProgressTracker({
  items,
  hideWhenComplete = true,
}: SimpleProgressTrackerProps) {
  const t = useTranslations("home.progress");
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = percentage === 100;

  const totalPoints = items
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + (item.points || 0), 0);

  if (isComplete && hideWhenComplete) {
    return null;
  }

  const incompleteItems = items.filter((item) => !item.completed);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <div className="p-4">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold">{t("title")}</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} {t("tasks")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {totalPoints} pts
            </Badge>
            <div className="text-lg font-bold text-primary">{percentage}%</div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Progress bar */}
        <Progress value={percentage} className="h-1.5 mt-3" />

        {/* Expandable content */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-4 space-y-2"
          >
            {incompleteItems.slice(0, 3).map((item) => (
              <Link key={item.id} href={item.href || "#"}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.points && (
                      <span className="text-xs text-muted-foreground">
                        +{item.points}
                      </span>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}

            {incompleteItems.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{incompleteItems.length - 3} more tasks
              </p>
            )}
          </motion.div>
        )}
      </div>
    </Card>
  );
}
