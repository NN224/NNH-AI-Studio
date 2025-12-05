"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { gmbLogger } from "@/lib/utils/logger";

// ============================================================================
// Types
// ============================================================================

interface SyncStep {
  id: string;
  label: string;
  icon: string;
  count?: number;
  total?: number;
  status: "waiting" | "syncing" | "done" | "error";
  error?: string;
}

interface BusinessSetupScreenProps {
  businessName: string;
  businessLogo?: string;
  onComplete: () => void;
  accountId: string;
}

// ============================================================================
// Floating Particles Component
// ============================================================================

function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-orange-400 to-purple-500"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            filter: "blur(1px)",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Data Stream Animation
// ============================================================================

function DataStream({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  const streams = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {streams.map((i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          style={{
            top: `${20 + i * 15}%`,
            width: "100%",
          }}
          animate={{
            x: ["-100%", "100%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Glowing Orb Component
// ============================================================================

function GlowingOrb({
  progress,
  isError,
}: {
  progress: number;
  isError?: boolean;
}) {
  const color = isError ? "#ef4444" : "#f97316";

  return (
    <div className="relative w-48 h-48">
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${color} ${progress}%, transparent ${progress}%)`,
          filter: "blur(20px)",
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Pulsing rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className={`absolute inset-0 rounded-full border ${isError ? "border-red-500/30" : "border-orange-500/30"}`}
          animate={{
            scale: [1, 1.5 + ring * 0.2],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            delay: ring * 0.4,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Main orb */}
      <motion.div
        className="absolute inset-4 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-2xl"
        animate={{
          boxShadow: [
            `0 0 20px ${color}4D`,
            `0 0 40px ${color}80`,
            `0 0 20px ${color}4D`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Progress text */}
        <div className="text-center">
          <motion.span
            className={`text-5xl font-bold bg-gradient-to-r ${isError ? "from-red-400 to-red-400" : "from-orange-400 to-purple-400"} bg-clip-text text-transparent`}
            key={progress}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {progress}%
          </motion.span>
        </div>
      </motion.div>

      {/* Orbiting dots */}
      {!isError &&
        [0, 1, 2].map((dot) => (
          <motion.div
            key={dot}
            className="absolute w-3 h-3 rounded-full bg-orange-500"
            style={{
              top: "50%",
              left: "50%",
              marginTop: -6,
              marginLeft: -6,
              filter: "blur(1px)",
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3 + dot,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-orange-400"
              style={{
                transform: `translateX(${80 + dot * 10}px)`,
              }}
            />
          </motion.div>
        ))}
    </div>
  );
}

// ============================================================================
// Sync Step Card Component
// ============================================================================

function SyncStepCard({ step, index }: { step: SyncStep; index: number }) {
  const statusColors = {
    waiting: "border-zinc-700 bg-zinc-900/50",
    syncing: "border-orange-500/50 bg-orange-500/5",
    done: "border-green-500/50 bg-green-500/5",
    error: "border-red-500/50 bg-red-500/5",
  };

  const iconColors = {
    waiting: "text-zinc-500",
    syncing: "text-orange-400",
    done: "text-green-400",
    error: "text-red-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`
        relative overflow-hidden rounded-xl border p-4
        transition-all duration-500 ${statusColors[step.status]}
      `}
    >
      {/* Shimmer effect for syncing */}
      {step.status === "syncing" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className={`text-2xl ${iconColors[step.status]}`}>{step.icon}</div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-200">{step.label}</span>
            {step.status === "done" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </motion.div>
            )}
            {step.status === "syncing" && (
              <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
            )}
            {step.status === "error" && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>

          {/* Progress bar for syncing */}
          {step.status === "syncing" && step.total && (
            <div className="mt-2">
              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((step.count || 0) / step.total) * 100}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {step.count} / {step.total}
              </div>
            </div>
          )}

          {/* Count for done */}
          {step.status === "done" && step.count !== undefined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-zinc-400"
            >
              {step.count} synced
            </motion.div>
          )}

          {/* Error message */}
          {step.status === "error" && step.error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-red-400"
            >
              {step.error}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BusinessSetupScreen({
  businessName,
  businessLogo,
  onComplete,
  accountId,
}: BusinessSetupScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [steps, setSteps] = useState<SyncStep[]>([
    { id: "locations", label: "Locations", icon: "📍", status: "waiting" },
    { id: "reviews", label: "Reviews", icon: "⭐", status: "waiting" },
    { id: "posts", label: "Posts", icon: "📝", status: "waiting" },
    { id: "questions", label: "Questions", icon: "❓", status: "waiting" },
    { id: "media", label: "Media", icon: "🖼️", status: "waiting" },
  ]);

  const syncStarted = useRef(false);

  const [quotes] = useState([
    "Great things take time...",
    "Building something amazing...",
    "Almost there...",
    "Preparing your command center...",
    "Loading awesomeness...",
  ]);
  const [currentQuote, setCurrentQuote] = useState(0);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  // Update step helper
  const updateStep = useCallback(
    (stepId: string, updates: Partial<SyncStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

  // Calculate progress based on steps
  const calculateProgress = useCallback(() => {
    const weights = {
      locations: 10,
      reviews: 35,
      posts: 20,
      questions: 20,
      media: 15,
    };
    let totalProgress = 0;

    steps.forEach((step) => {
      const weight = weights[step.id as keyof typeof weights] || 20;
      if (step.status === "done") {
        totalProgress += weight;
      } else if (step.status === "syncing" && step.total && step.count) {
        totalProgress += (step.count / step.total) * weight;
      }
    });

    return Math.round(totalProgress);
  }, [steps]);

  // Update progress when steps change
  useEffect(() => {
    setProgress(calculateProgress());
  }, [steps, calculateProgress]);

  // Display sync progress animation
  // Note: The actual sync job was already enqueued by the import endpoint
  // This function just provides visual feedback to the user
  const startSync = useCallback(async () => {
    if (syncStarted.current) return;
    syncStarted.current = true;

    try {
      // Step 1: Locations (already imported, just mark as done)
      updateStep("locations", { status: "syncing", count: 0, total: 1 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      updateStep("locations", { status: "done", count: 1 });

      gmbLogger.info("Starting sync progress animation", {
        accountId,
        note: "Sync job already enqueued by import endpoint",
      });

      // Step 2: Show progress animations for all data types
      // The actual sync is happening in the background via the discovery_locations job
      updateStep("reviews", { status: "syncing", count: 0, total: 100 });
      updateStep("posts", { status: "syncing", count: 0, total: 50 });
      updateStep("questions", { status: "syncing", count: 0, total: 30 });
      updateStep("media", { status: "syncing", count: 0, total: 20 });

      // Simulate progress while sync happens in background
      // Reviews progress (40% of total animation)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        updateStep("reviews", { count: i });
      }
      updateStep("reviews", { status: "done", count: 0 });

      // Posts progress (25% of total animation)
      for (let i = 0; i <= 50; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        updateStep("posts", { count: i });
      }
      updateStep("posts", { status: "done", count: 0 });

      // Questions progress (20% of total animation)
      for (let i = 0; i <= 30; i += 5) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        updateStep("questions", { count: i });
      }
      updateStep("questions", { status: "done", count: 0 });

      // Media progress (15% of total animation)
      for (let i = 0; i <= 20; i += 5) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        updateStep("media", { count: i });
      }
      updateStep("media", { status: "done", count: 0 });

      // Get actual counts from database after animation completes
      try {
        const countResponse = await fetch(
          `/api/gmb/sync-status?accountId=${accountId}`,
        );
        if (countResponse.ok) {
          const countData = await countResponse.json();
          updateStep("reviews", {
            status: "done",
            count: countData.reviewsCount || 0,
          });
          updateStep("posts", {
            status: "done",
            count: countData.postsCount || 0,
          });
          updateStep("questions", {
            status: "done",
            count: countData.questionsCount || 0,
          });
          updateStep("media", {
            status: "done",
            count: countData.mediaCount || 0,
          });
        }
      } catch (countError) {
        // Non-critical - just log it
        gmbLogger.warn("Failed to fetch sync counts", {
          error:
            countError instanceof Error
              ? countError.message
              : String(countError),
        });
      }

      // Complete!
      setProgress(100);
      setIsComplete(true);

      // Celebration! 🎉
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f97316", "#a855f7", "#22c55e"],
      });

      // Wait a bit then redirect
      setTimeout(onComplete, 2500);
    } catch (error) {
      gmbLogger.error(
        "Sync animation failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      setHasError(true);
    }
  }, [accountId, onComplete, updateStep]);

  useEffect(() => {
    startSync();
  }, [startSync]);

  const handleRetry = () => {
    setHasError(false);
    syncStarted.current = false;
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        status: "waiting",
        count: undefined,
        total: undefined,
      })),
    );
    setProgress(0);
    startSync();
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4 overflow-hidden">
      {/* Background effects */}
      <FloatingParticles />
      <DataStream isActive={!isComplete && !hasError} />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50 pointer-events-none" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/50 mb-6"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-zinc-300">
              Setting up your workspace
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold text-white mb-2"
          >
            {businessName}
          </motion.h1>

          <AnimatePresence mode="wait">
            <motion.p
              key={hasError ? "error" : currentQuote}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={hasError ? "text-red-400" : "text-zinc-400"}
            >
              {hasError ? "Something went wrong..." : quotes[currentQuote]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Glowing orb */}
        <div className="flex justify-center mb-10">
          <GlowingOrb progress={progress} isError={hasError} />
        </div>

        {/* Sync steps grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {steps.map((step, index) => (
            <SyncStepCard key={step.id} step={step} index={index} />
          ))}
        </div>

        {/* Error actions */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4 mb-8"
          >
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <Loader2 className="w-4 h-4" />
              Try Again
            </Button>
            <Button onClick={handleSkip} variant="ghost">
              Skip & Continue
            </Button>
          </motion.div>
        )}

        {/* Completion message */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">
                  All set! Launching your dashboard...
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer hint */}
        {!isComplete && !hasError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-sm text-zinc-500"
          >
            ☕ This usually takes 30-60 seconds
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
