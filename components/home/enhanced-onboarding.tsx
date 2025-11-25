"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  Target,
  Zap,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Building2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  targetSelector?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your AI-Powered Dashboard! 🎉",
    description:
      "Let me show you how to 10x your business management with AI. This quick tour will help you get started!",
    icon: Rocket,
  },
  {
    id: "business-profile",
    title: "Your Business Profile",
    description:
      "See your business info, rating, and health score at a glance. Keep your profile complete for better visibility!",
    icon: Building2,
    targetSelector: "[data-tour='business-profile']",
  },
  {
    id: "progress",
    title: "Track Your Progress",
    description:
      "Complete these tasks to unlock the full potential of your dashboard. Each task earns you points!",
    icon: ListChecks,
    targetSelector: "[data-tour='progress-tracker']",
  },
  {
    id: "quick-actions",
    title: "One-Click Power Actions",
    description:
      "Access everything you need instantly - manage reviews, analytics, posts, and more with a single click!",
    icon: Zap,
    targetSelector: ".quick-actions",
  },
  {
    id: "ai-suggestions",
    title: "Smart AI Suggestions",
    description:
      "Get personalized recommendations to improve your business. Our AI analyzes your data and suggests actions!",
    icon: Sparkles,
    targetSelector: "[data-tour='ai-suggestions']",
  },
  {
    id: "stats",
    title: "Interactive Analytics",
    description:
      "Dive deep into your business performance with interactive charts. Filter by day, week, month, or year!",
    icon: BarChart3,
    targetSelector: "[data-tour='stats-dashboard']",
  },
  {
    id: "ai-chat",
    title: "Your 24/7 AI Assistant",
    description:
      "Have questions? Click the chat button in the bottom right corner anytime to get instant AI-powered help!",
    icon: MessageSquare,
    targetSelector: "[data-tour='ai-chat']",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description:
      "Congratulations! You've unlocked the full power of AI-driven business management. Let's achieve greatness together!",
    icon: Target,
  },
];

export function EnhancedOnboarding() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem("enhanced-onboarding-completed");
    if (completed) {
      setHasCompletedTour(true);
    } else {
      const timer = setTimeout(() => setIsActive(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const step = tourSteps[currentStep];
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(step.targetSelector!);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [currentStep, isActive]);

  useEffect(() => {
    if (isActive && currentStep === tourSteps.length - 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f97316", "#eab308", "#22c55e"],
      });
    }
  }, [currentStep, isActive]);

  const completeTour = useCallback(() => {
    localStorage.setItem("enhanced-onboarding-completed", "true");
    setHasCompletedTour(true);
    setIsActive(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem("enhanced-onboarding-completed");
    setHasCompletedTour(false);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  useEffect(() => {
    // Expose restart function for testing
    if (typeof window !== "undefined") {
      (
        window as Window & { restartOnboardingTour?: () => void }
      ).restartOnboardingTour = restartTour;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as Window & { restartOnboardingTour?: () => void })
          .restartOnboardingTour;
      }
    };
  }, [restartTour]);

  if (hasCompletedTour || !isActive) return null;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isCenterStep = !step.targetSelector;

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay with spotlight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100"
            onClick={completeTour}
          >
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - 8}
                      y={targetRect.top - 8}
                      width={targetRect.width + 16}
                      height={targetRect.height + 16}
                      rx="12"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.85)"
                mask="url(#spotlight-mask)"
              />
            </svg>
            {targetRect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute pointer-events-none border-2 border-orange-500/50 rounded-xl"
                style={{
                  left: targetRect.left - 8,
                  top: targetRect.top - 8,
                  width: targetRect.width + 16,
                  height: targetRect.height + 16,
                  boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)",
                }}
              />
            )}
          </motion.div>

          {/* Tooltip */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed z-101",
              isCenterStep
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                : "left-1/2 -translate-x-1/2",
            )}
            style={
              !isCenterStep && targetRect
                ? {
                    top:
                      targetRect.bottom + 320 > window.innerHeight
                        ? Math.max(20, targetRect.top - 320)
                        : targetRect.bottom + 20,
                  }
                : undefined
            }
          >
            <Card className="w-[90vw] max-w-md bg-linear-to-br from-gray-900 via-black to-gray-900 border-orange-500/50 shadow-2xl">
              <div className="relative h-1 bg-gray-800 rounded-t-lg overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-linear-to-r from-orange-500 to-yellow-500"
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    variant="outline"
                    className="text-xs border-orange-500/30 text-orange-400"
                  >
                    Step {currentStep + 1} of {tourSteps.length}
                  </Badge>
                  <button
                    onClick={completeTour}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="shrink-0"
                    >
                      <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 py-2">
                    {tourSteps.map((_, index) => (
                      <motion.div
                        key={index}
                        animate={{ width: index === currentStep ? 24 : 6 }}
                        className={cn(
                          "h-1.5 rounded-full",
                          index <= currentStep
                            ? "bg-orange-500"
                            : "bg-gray-700",
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      onClick={completeTour}
                      className="text-gray-500"
                    >
                      Skip Tour
                    </Button>
                    <div className="flex gap-2">
                      {currentStep > 0 && (
                        <Button
                          variant="outline"
                          onClick={handlePrev}
                          className="border-gray-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={handleNext}
                        className="bg-linear-to-r from-orange-500 to-orange-600"
                      >
                        {currentStep === tourSteps.length - 1 ? (
                          <>
                            Complete <CheckCircle className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>
                            Next <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
