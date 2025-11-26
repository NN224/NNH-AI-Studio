"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  Building2,
  CheckCircle,
  MessageSquare,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";

const features = [
  {
    icon: MessageSquare,
    title: "Manage Reviews",
    description: "Respond to customer reviews with AI assistance",
  },
  {
    icon: Bot,
    title: "AI Auto-Reply",
    description: "Let AI handle responses automatically",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track performance and insights",
  },
  {
    icon: Star,
    title: "Boost Ratings",
    description: "Improve your business reputation",
  },
];

export function EmptyState() {
  const t = useTranslations("home.emptyState");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      {/* Main Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
        <CardContent className="p-8 md:p-12">
          {/* Header Section */}
          <div className="text-center mb-10">
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-lg shadow-primary/30"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t("title")}
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 text-center hover:border-primary/50 transition-colors"
              >
                <feature.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Left: Info */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">
                  Connect Your Business Profile
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Link your Google Business Profile to unlock all features and
                  start managing your online presence with AI.
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Free to connect
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Secure OAuth
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Instant sync
                  </span>
                </div>
              </div>

              {/* Right: Buttons */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <Link href="/settings">
                  <Button
                    size="lg"
                    className="w-full md:w-auto gap-2 bg-[#4285F4] hover:bg-[#357ABD] text-white shadow-lg"
                  >
                    <Building2 className="w-5 h-5" />
                    {t("connectGMB")}
                  </Button>
                </Link>

                <Link href="/youtube-dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full md:w-auto gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    <Play className="w-5 h-5" />
                    {t("connectYouTube")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-sm text-muted-foreground text-center mt-6">
            {t("helpText")}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
