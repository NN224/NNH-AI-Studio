"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gmbLogger } from "@/lib/utils/logger";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Rocket,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Demo stats to show what the dashboard looks like
const DEMO_STATS = {
  reviews: 247,
  rating: 4.8,
  responseRate: 94,
  locations: 3,
};

const FEATURES = [
  {
    icon: Bot,
    title: "AI Auto-Replies",
    description: "Respond to reviews 24/7 with human-like AI responses",
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Track performance, sentiment, and growth trends",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    icon: MessageSquare,
    title: "Review Management",
    description: "Manage all reviews from one unified dashboard",
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description: "Real-time sync with Google Business Profile",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Connect",
    description: "Link your Google Business Profile",
    icon: Building2,
  },
  {
    number: 2,
    title: "Sync",
    description: "Import your locations & reviews",
    icon: TrendingUp,
  },
  {
    number: 3,
    title: "Manage",
    description: "Start managing with AI assistance",
    icon: Sparkles,
  },
];

export function NewUserWelcome() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGMB = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/gmb/create-auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.pathname }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Connection failed (${response.status})`,
        );
      }

      const data = await response.json();

      if (data.authUrl) {
        // Show a toast before redirecting
        toast.info("Redirecting to Google...", {
          description: "Please authorize access to your Business Profile.",
          duration: 3000,
        });
        // Small delay to show the toast
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to create authentication URL");
      }
    } catch (error) {
      gmbLogger.error(
        "Error connecting GMB",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("Failed to connect Google Business", {
        description:
          error instanceof Error ? error.message : "Please try again.",
        action: {
          label: "Retry",
          onClick: () => handleConnectGMB(),
        },
      });
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative inline-block mb-8"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <Rocket className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Welcome to{" "}
          </span>
          <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
            NNH AI Studio
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Supercharge your Google Business Profile with AI-powered automation.
          Manage reviews, boost ratings, and save hours every week.
        </p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            size="lg"
            onClick={handleConnectGMB}
            disabled={isConnecting}
            className="h-14 px-8 text-lg gap-3 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg shadow-orange-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-orange-500/30"
          >
            <Building2 className="w-5 h-5" />
            {isConnecting ? "Connecting..." : "Connect Google Business"}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-zinc-500"
        >
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            Secure OAuth
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            2-minute setup
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
            Free to start
          </span>
        </motion.div>
      </motion.div>

      {/* Steps Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mb-12"
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">
                    Step {step.number}
                  </div>
                  <div className="font-semibold text-white">{step.title}</div>
                  <div className="text-xs text-zinc-400">
                    {step.description}
                  </div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block w-5 h-5 text-zinc-600" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
      >
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
          >
            <Card
              className={`p-6 bg-zinc-900/50 backdrop-blur-sm border ${feature.borderColor} hover:bg-zinc-900/80 transition-all duration-300 hover:-translate-y-1 h-full`}
            >
              <div
                className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}
              >
                <feature.icon
                  className={`w-6 h-6 bg-gradient-to-r ${feature.color} bg-clip-text`}
                  style={{
                    color: feature.color.includes("purple")
                      ? "#a855f7"
                      : feature.color.includes("blue")
                        ? "#3b82f6"
                        : feature.color.includes("orange")
                          ? "#f97316"
                          : "#22c55e",
                  }}
                />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400">{feature.description}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Demo Preview Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="relative"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            See What You'll Get
          </h2>
          <p className="text-zinc-400">
            A preview of your dashboard after connecting
          </p>
        </div>

        {/* Blurred Demo Dashboard */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
          {/* Blur Overlay */}
          <div className="absolute inset-0 backdrop-blur-sm bg-black/40 z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Connect to Unlock
              </h3>
              <p className="text-zinc-400 mb-4 max-w-sm">
                Link your Google Business Profile to see your real data here
              </p>
              <Button
                onClick={handleConnectGMB}
                disabled={isConnecting}
                className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600"
              >
                <Building2 className="w-4 h-4" />
                {isConnecting ? "Connecting..." : "Connect Now"}
              </Button>
            </div>
          </div>

          {/* Demo Content */}
          <div className="p-6 opacity-60">
            {/* Demo Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <MessageSquare className="w-4 h-4" />
                  Reviews
                </div>
                <div className="text-2xl font-bold text-white">
                  {DEMO_STATS.reviews}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Star className="w-4 h-4" />
                  Rating
                </div>
                <div className="text-2xl font-bold text-white">
                  {DEMO_STATS.rating}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Response Rate
                </div>
                <div className="text-2xl font-bold text-white">
                  {DEMO_STATS.responseRate}%
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Building2 className="w-4 h-4" />
                  Locations
                </div>
                <div className="text-2xl font-bold text-white">
                  {DEMO_STATS.locations}
                </div>
              </div>
            </div>

            {/* Demo Chart Placeholder */}
            <div className="bg-zinc-800/50 rounded-xl p-6 h-48 flex items-center justify-center">
              <div className="flex items-end gap-2 h-32">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div
                    key={i}
                    className="w-8 bg-gradient-to-t from-orange-500/50 to-purple-500/50 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-center mt-12"
      >
        <p className="text-zinc-500 text-sm">
          Already have an account?{" "}
          <button
            onClick={handleConnectGMB}
            className="text-orange-500 hover:text-orange-400 font-medium"
          >
            Connect your business
          </button>
        </p>
      </motion.div>
    </div>
  );
}
