"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Eye,
  Rocket,
  Sparkles,
  Youtube,
  CheckCircle2,
  Loader2,
  Zap,
  TrendingUp,
  Shield,
  MessageSquare,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface OnboardingScreenProps {
  userName?: string;
}

export function OnboardingScreen({ userName }: OnboardingScreenProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";
  const [isConnectingGMB, setIsConnectingGMB] = useState(false);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Loading steps للعرض أثناء الانتظار
  const loadingSteps = [
    { text: "جاري التحقق من الحساب...", icon: Shield },
    { text: "تجهيز البيانات...", icon: TrendingUp },
    { text: "تفعيل الميزات الذكية...", icon: Zap },
    { text: "جاهز تقريباً...", icon: CheckCircle2 },
  ];

  // Animate loading steps
  useEffect(() => {
    if (!isConnectingGMB && !isConnectingYouTube) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnectingGMB, isConnectingYouTube]);

  const handleConnectGMB = async () => {
    setIsConnectingGMB(true);
    setLoadingStep(0);
    
    try {
      toast.info("جاري التوجيه إلى Google...", {
        description: "سيُطلب منك السماح بالوصول لحسابك التجاري.",
      });

      const response = await fetch("/api/gmb/create-auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `/${locale}/home` }),
      });

      if (!response.ok) {
        throw new Error("Failed to create auth URL");
      }

      const data = await response.json();
      if (data.authUrl) {
        // Show success animation
        setShowConfetti(true);
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 500);
      }
    } catch (error) {
      gmbLogger.error(
        "Error connecting GMB",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("فشل الاتصال. يرجى المحاولة مرة أخرى.");
      setIsConnectingGMB(false);
      setLoadingStep(0);
    }
  };

  const handleConnectYouTube = async () => {
    setIsConnectingYouTube(true);
    try {
      toast.info("Redirecting to YouTube...", {
        description: "Please authorize access to your channel.",
      });
      // TODO: Implement YouTube OAuth
      router.push(`/${locale}/youtube-dashboard`);
    } catch (error) {
      toast.error("Failed to connect YouTube. Please try again.");
      setIsConnectingYouTube(false);
    }
  };

  const handleDemoMode = async () => {
    try {
      toast.info("Welcome to Demo Mode! 👀", {
        description: "Explore the AI Command Center with realistic demo data.",
      });

      // Redirect to public preview page (no auth required)
      router.push(`/${locale}/preview`);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const displayName = userName?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 mb-6"
          >
            <Rocket className="h-10 w-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold text-white mb-3"
          >
            Welcome, {displayName}! 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-lg max-w-md mx-auto"
          >
            Let's get you set up. Connect at least one account to unlock all the
            powerful features.
          </motion.p>
        </div>

        {/* Connection Options */}
        <div className="space-y-4 mb-8">
          {/* Google Business Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-orange-600/30 transition-all">
                  <Building2 className="h-7 w-7 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Connect Google Business
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Manage reviews, posts, and analytics with AI assistance
                  </p>
                </div>
                <Button
                  onClick={handleConnectGMB}
                  disabled={isConnectingGMB}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  {isConnectingGMB ? (
                    "Connecting..."
                  ) : (
                    <>
                      Connect
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* YouTube Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-zinc-900/50 border-zinc-800 hover:border-red-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center group-hover:from-red-500/30 group-hover:to-red-600/30 transition-all">
                  <Youtube className="h-7 w-7 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Connect YouTube Channel
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Manage videos, comments, and grow your audience
                  </p>
                </div>
                <Button
                  onClick={handleConnectYouTube}
                  disabled={isConnectingYouTube}
                  variant="outline"
                  className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
                >
                  {isConnectingYouTube ? (
                    "Connecting..."
                  ) : (
                    <>
                      Connect
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-500 text-sm">
              or
            </span>
          </div>
        </motion.div>

        {/* Demo Mode - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50 transition-all">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 mb-3">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Try Live Demo First
              </h3>
              <p className="text-sm text-zinc-300 mb-4">
                Experience the full AI Command Center with realistic demo data.
                <br />
                <span className="text-purple-400 font-medium">
                  No account connection required!
                </span>
              </p>
              <Button
                onClick={handleDemoMode}
                variant="outline"
                className="gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 w-full sm:w-auto"
              >
                <Eye className="h-4 w-4" />
                Launch Interactive Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 pt-8 border-t border-zinc-800"
        >
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mb-4">
            <Sparkles className="h-4 w-4" />
            What you'll unlock
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-xs text-zinc-400">
            <div className="p-3 rounded-lg bg-zinc-900/30">
              <div className="text-2xl mb-1">🤖</div>
              AI Auto-Replies
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30">
              <div className="text-2xl mb-1">📊</div>
              Smart Analytics
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30">
              <div className="text-2xl mb-1">⚡</div>
              One-Click Posts
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
