"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CheckCircle,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

type CelebrationType =
  | "first-review"
  | "first-reply"
  | "sync-complete"
  | "milestone"
  | "achievement"
  | "streak";

interface SuccessCelebrationProps {
  type: CelebrationType;
  title?: string;
  message?: string;
  onComplete?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}

const celebrationConfig: Record<
  CelebrationType,
  {
    icon: React.ElementType;
    defaultTitle: string;
    defaultMessage: string;
    color: string;
    bgColor: string;
    confettiColors: string[];
  }
> = {
  "first-review": {
    icon: Star,
    defaultTitle: "First Review Received!",
    defaultMessage: "Your business is getting noticed",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
    confettiColors: ["#FFD700", "#FFA500", "#FF8C00"],
  },
  "first-reply": {
    icon: CheckCircle,
    defaultTitle: "First Reply Sent!",
    defaultMessage: "Great job engaging with your customers",
    color: "text-green-500",
    bgColor: "bg-green-500/20",
    confettiColors: ["#22C55E", "#16A34A", "#15803D"],
  },
  "sync-complete": {
    icon: Zap,
    defaultTitle: "Sync Complete!",
    defaultMessage: "Your data is up to date",
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    confettiColors: ["#3B82F6", "#2563EB", "#1D4ED8"],
  },
  milestone: {
    icon: Target,
    defaultTitle: "Milestone Reached!",
    defaultMessage: "You're making great progress",
    color: "text-purple-500",
    bgColor: "bg-purple-500/20",
    confettiColors: ["#A855F7", "#9333EA", "#7C3AED"],
  },
  achievement: {
    icon: Trophy,
    defaultTitle: "Achievement Unlocked!",
    defaultMessage: "You've earned a new badge",
    color: "text-amber-500",
    bgColor: "bg-amber-500/20",
    confettiColors: ["#F59E0B", "#D97706", "#B45309"],
  },
  streak: {
    icon: Award,
    defaultTitle: "Streak Bonus!",
    defaultMessage: "Keep up the momentum",
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    confettiColors: ["#F97316", "#EA580C", "#C2410C"],
  },
};

export function SuccessCelebration({
  type,
  title,
  message,
  onComplete,
  autoHide = true,
  hideDelay = 3000,
}: SuccessCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = celebrationConfig[type];
  const Icon = config.icon;

  // Trigger confetti
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: config.confettiColors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: config.confettiColors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [config.confettiColors]);

  // Auto-hide
  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onComplete?.(), 300);
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-6 flex items-center gap-4 min-w-[300px]">
            {/* Icon */}
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`w-14 h-14 rounded-full ${config.bgColor} flex items-center justify-center`}
            >
              <Icon className={`w-7 h-7 ${config.color}`} />
            </motion.div>

            {/* Content */}
            <div className="flex-1">
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="font-bold text-lg flex items-center gap-2"
              >
                {title || config.defaultTitle}
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground"
              >
                {message || config.defaultMessage}
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to trigger celebrations
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    type: CelebrationType;
    title?: string;
    message?: string;
  } | null>(null);

  const celebrate = (
    type: CelebrationType,
    options?: { title?: string; message?: string },
  ) => {
    setCelebration({ type, ...options });
  };

  const CelebrationComponent = celebration ? (
    <SuccessCelebration
      type={celebration.type}
      title={celebration.title}
      message={celebration.message}
      onComplete={() => setCelebration(null)}
    />
  ) : null;

  return { celebrate, CelebrationComponent };
}
