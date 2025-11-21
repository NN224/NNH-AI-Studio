"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Dashboard! 🎉",
    description:
      "Let's take a quick tour to show you around. This will only take a minute!",
    position: "center",
  },
  {
    id: "hero",
    title: "Personalized Greeting",
    description:
      "Your dashboard greets you based on the time of day and shows quick stats.",
    position: "top",
  },
  {
    id: "progress",
    title: "Track Your Progress",
    description:
      "Complete these tasks to unlock all features and get the most out of the platform.",
    position: "top",
  },
  {
    id: "quick-actions",
    title: "Quick Actions",
    description:
      "Access all major features with just one click from these action buttons.",
    position: "top",
  },
  {
    id: "stats",
    title: "Your Statistics",
    description:
      "Monitor your performance with real-time stats and trend charts.",
    position: "top",
  },
  {
    id: "ai-insights",
    title: "AI-Powered Insights",
    description:
      "Get smart recommendations and actionable insights powered by AI.",
    position: "top",
  },
  {
    id: "ai-chat",
    title: "AI Assistant",
    description:
      "Need help? Click the orange button to chat with your AI assistant anytime!",
    position: "left",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description:
      "You're ready to start managing your business like a pro. Let's go!",
    position: "center",
  },
];

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  useEffect(() => {
    // Check if user has completed tour
    const completed = localStorage.getItem("onboarding-completed");
    if (!completed) {
      // Start tour after 2 seconds
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setHasCompletedTour(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem("onboarding-completed", "true");
    setIsActive(false);
    setHasCompletedTour(true);
  };

  const skipTour = () => {
    completeTour();
  };

  if (hasCompletedTour || !isActive) return null;

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={skipTour}
          />

          {/* Tour Card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed z-[101] ${
              step.position === "center"
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                : "top-24 left-1/2 -translate-x-1/2"
            }`}
          >
            <Card className="w-[90vw] max-w-md bg-black/95 backdrop-blur-xl border-orange-500/30 p-6 shadow-2xl shadow-orange-500/20">
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? "w-8 bg-orange-500"
                        : index < currentStep
                          ? "w-2 bg-orange-500/50"
                          : "w-2 bg-gray-700"
                    }`}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="h-8 w-8 text-white" />
                </motion.div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={skipTour}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Skip Tour
                  </Button>

                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        onClick={handlePrev}
                        className="border-orange-500/30"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    )}

                    <Button
                      onClick={handleNext}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {currentStep === tourSteps.length - 1 ? (
                        "Get Started"
                      ) : (
                        <>
                          Next
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={skipTour}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
