"use client";

import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle,
  MessageSquare,
  PartyPopper,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WelcomeNewUserProps {
  businessName?: string;
  onComplete: () => void;
  onStartTour?: () => void;
}

const features = [
  {
    icon: MessageSquare,
    title: "Review Management",
    description: "Respond to all your reviews in one place",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Bot,
    title: "AI Auto-Reply",
    description: "Let AI craft perfect responses automatically",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track your business performance",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description: "Real-time updates from Google",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export function WelcomeNewUser({
  businessName,
  onComplete,
  onStartTour,
}: WelcomeNewUserProps) {
  const [step, setStep] = useState(0);

  // Trigger confetti on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <div className="max-w-2xl w-full mx-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-8 shadow-2xl shadow-green-500/30"
              >
                <PartyPopper className="w-12 h-12 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold mb-4"
              >
                Welcome to NNH AI Studio!
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-muted-foreground mb-2"
              >
                {businessName ? (
                  <>
                    <span className="text-primary font-semibold">
                      {businessName}
                    </span>{" "}
                    is now connected!
                  </>
                ) : (
                  "Your account is now connected!"
                )}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground mb-8"
              >
                We&apos;re syncing your data. This usually takes less than a
                minute.
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  size="lg"
                  onClick={() => setStep(1)}
                  className="gap-2 text-lg px-8"
                >
                  See What You Can Do
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="features"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-card border border-border rounded-2xl p-8 shadow-2xl"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  Here&apos;s What You Can Do
                </h2>
                <p className="text-muted-foreground">
                  Powerful tools to manage your online presence
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background/50 hover:border-primary/50 transition-colors"
                  >
                    <div className={`p-3 rounded-lg ${feature.bg}`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {onStartTour && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      onComplete();
                      onStartTour();
                    }}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Take a Quick Tour
                  </Button>
                )}
                <Button size="lg" onClick={onComplete} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
