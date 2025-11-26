"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  MessageSquare,
  Settings,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ElementType;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
  onDismiss?: () => void;
  className?: string;
}

const defaultItems: ChecklistItem[] = [
  {
    id: "connect-gmb",
    title: "Connect Google Business Profile",
    description: "Link your business to start managing reviews",
    completed: false,
    href: "/settings",
    icon: Building2,
  },
  {
    id: "first-review",
    title: "Reply to your first review",
    description: "Respond to a customer review",
    completed: false,
    href: "/reviews",
    icon: MessageSquare,
  },
  {
    id: "setup-ai",
    title: "Configure AI settings",
    description: "Customize how AI generates responses",
    completed: false,
    href: "/settings/ai",
    icon: Bot,
  },
  {
    id: "enable-autopilot",
    title: "Enable Auto-Reply",
    description: "Let AI handle responses automatically",
    completed: false,
    href: "/settings/auto-pilot",
    icon: Settings,
  },
];

export function OnboardingChecklist({
  items = defaultItems,
  onDismiss,
  className,
}: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const isComplete = completedCount === items.length;

  if (dismissed) return null;

  // All complete - show celebration
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={className}
      >
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-600 dark:text-green-400">
                🎉 Setup Complete!
              </h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve completed all onboarding steps. You&apos;re all set!
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDismissed(true);
                onDismiss?.();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="overflow-hidden border-primary/20">
        {/* Header */}
        <div
          className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Getting Started</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {items.length} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                {Math.round(progress)}%
              </span>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        {/* Checklist Items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-2">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={item.href}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          item.completed
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20"
                        }`}
                      >
                        {/* Status Icon */}
                        {item.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}

                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            item.completed ? "bg-green-500/20" : "bg-primary/10"
                          }`}
                        >
                          <item.icon
                            className={`w-4 h-4 ${
                              item.completed ? "text-green-500" : "text-primary"
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm ${
                              item.completed
                                ? "text-green-600 dark:text-green-400 line-through"
                                : ""
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>

                        {/* Arrow */}
                        {!item.completed && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
