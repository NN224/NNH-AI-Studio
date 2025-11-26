"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  icon: React.ElementType;
  position?: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: "home",
    target: "[data-tour='home']",
    title: "Your Dashboard",
    description:
      "This is your command center. See all your business stats at a glance.",
    icon: Home,
    position: "bottom",
  },
  {
    id: "reviews",
    target: "[data-tour='reviews']",
    title: "Review Management",
    description: "View and respond to all your customer reviews in one place.",
    icon: MessageSquare,
    position: "right",
  },
  {
    id: "ai-reply",
    target: "[data-tour='ai-reply']",
    title: "AI-Powered Replies",
    description:
      "Let AI generate professional responses for you. Just click and send!",
    icon: Bot,
    position: "bottom",
  },
  {
    id: "analytics",
    target: "[data-tour='analytics']",
    title: "Analytics & Insights",
    description:
      "Track your performance, ratings, and customer sentiment over time.",
    icon: BarChart3,
    position: "right",
  },
  {
    id: "settings",
    target: "[data-tour='settings']",
    title: "Customize Your Experience",
    description:
      "Configure AI settings, auto-reply rules, and notification preferences.",
    icon: Settings,
    position: "left",
  },
];

export function GuidedTour({ onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and highlight target element
  const updateTargetPosition = useCallback(() => {
    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll into view if needed
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (isLastStep) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => onSkip?.() || onComplete(), 300);
  };

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    switch (step.position) {
      case "top":
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Spotlight on target */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[101] rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-transparent pointer-events-none"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[102] w-80"
            style={getTooltipPosition()}
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-primary/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Step {currentStep + 1} of {tourSteps.length}
                    </p>
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {step.description}
                </p>

                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mb-4">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? "bg-primary"
                          : index < currentStep
                            ? "bg-primary/50"
                            : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      className="flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext} className="flex-1">
                    {isLastStep ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manage tour state
export function useGuidedTour() {
  const [showTour, setShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("hasSeenGuidedTour");
    setHasSeenTour(seen === "true");
  }, []);

  const startTour = () => setShowTour(true);

  const completeTour = () => {
    setShowTour(false);
    setHasSeenTour(true);
    localStorage.setItem("hasSeenGuidedTour", "true");
  };

  const TourComponent = showTour ? (
    <GuidedTour onComplete={completeTour} onSkip={completeTour} />
  ) : null;

  return { startTour, TourComponent, hasSeenTour };
}
