"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Bot,
  MessageSquare,
  Rocket,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function GMBOnboardingView() {
  const params = useParams();
  const locale = params?.locale || "en";
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGMB = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/gmb/create-auth-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: window.location.pathname, // Remember where user came from
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error("Failed to create authentication URL");
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("Error connecting GMB:", error);
      toast.error("Failed to connect Google My Business");
      setIsConnecting(false);
    }
  };

  const features = [
    {
      icon: Bot,
      title: "AI Auto-Replies",
      description:
        "Let AI handle your reviews and questions 24/7 with human-like responses.",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      description:
        "Get deep insights into your business performance and customer behavior.",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      icon: MessageSquare,
      title: "Review Management",
      description:
        "Monitor, manage, and respond to all your Google reviews in one place.",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto space-y-6 mb-12">
        <div className="relative inline-block">
          <div className="absolute -inset-1 bg-linear-to-r from-orange-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="relative bg-zinc-900 p-4 rounded-full border border-zinc-800">
            <Rocket className="h-12 w-12 text-orange-500" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-zinc-200 to-zinc-400">
            Connect Your Business to <br />
            <span className="text-orange-500">Unlock the Magic! 🚀</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
            You're one step away from supercharging your Google Business Profile
            with AI-powered automation and insights.
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleConnectGMB}
          disabled={isConnecting}
          className="h-14 px-8 text-lg gap-3 bg-linear-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg shadow-orange-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? "Connecting..." : "Connect Google Business"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {features.map((feature, index) => (
          <Card
            key={index}
            className={`p-6 bg-zinc-900/50 backdrop-blur-sm border ${feature.border} hover:bg-zinc-900/80 transition-all duration-300 hover:-translate-y-1`}
          >
            <div
              className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}
            >
              <feature.icon className={`h-6 w-6 ${feature.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
