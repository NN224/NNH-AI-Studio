"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/navigation";

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
}

interface ProgressTrackerProps {
  items: ProgressItem[];
  hideWhenComplete?: boolean;
}

export function ProgressTracker({
  items,
  hideWhenComplete = true,
}: ProgressTrackerProps) {
  const t = useTranslations("home.progress");

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = percentage === 100;

  // Hide if complete and hideWhenComplete is true
  if (isComplete && hideWhenComplete) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 via-black to-yellow-500/5 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </motion.div>
                ) : (
                  <Circle className="h-5 w-5 text-orange-500" />
                )}
                {t("title")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isComplete ? t("complete") : t("subtitle")}
              </p>
            </div>
            <div className="text-right">
              <motion.div
                key={percentage}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent"
              >
                {percentage}%
              </motion.div>
              <p className="text-xs text-gray-500">
                {completedCount}/{totalCount} {t("tasks")}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Progress value={percentage} className="h-2 bg-gray-800" />
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  item.completed
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.completed ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </motion.div>
                  ) : (
                    <Circle className="h-5 w-5 text-orange-500" />
                  )}
                  <span
                    className={`text-sm ${item.completed ? "text-gray-500 line-through" : "text-foreground"}`}
                  >
                    {item.label}
                  </span>
                </div>

                {!item.completed && item.href && (
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs hover:bg-orange-500/10 hover:text-orange-500"
                    >
                      {t("complete")}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          {/* Motivational message for incomplete */}
          {!isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
            >
              <p className="text-xs text-orange-500 text-center">
                {t("motivation")}
              </p>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
