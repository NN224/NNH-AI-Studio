"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Video,
  BarChart3,
  MessageSquare,
  MapPin,
  FileText,
  Sparkles,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const quickActions = [
  {
    icon: Video,
    label: "uploadVideo",
    href: "/youtube-dashboard",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: BarChart3,
    label: "viewAnalytics",
    href: "/analytics",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: MessageSquare,
    label: "replyReviews",
    href: "/reviews",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: MapPin,
    label: "manageLocations",
    href: "/locations",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: FileText,
    label: "createPost",
    href: "/posts",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Sparkles,
    label: "aiStudio",
    href: "/ai-command-center",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function QuickActions() {
  const t = useTranslations("home.quickActions");

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-border/40 bg-card/50 backdrop-blur relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-purple-500/5 opacity-50" />

        <div className="p-4 relative z-10">
          <motion.h2
            className="text-sm font-semibold text-muted-foreground mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t("title")}
          </motion.h2>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {quickActions.map((action) => (
              <motion.div key={action.href} variants={item}>
                <Link href={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col gap-2 py-4 border-border/50 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all group relative overflow-hidden"
                    >
                      {/* Hover gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <motion.div
                        className={`p-2 rounded-lg ${action.bgColor} relative z-10`}
                        whileHover={{
                          rotate: [0, -10, 10, -10, 0],
                          scale: 1.1,
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </motion.div>
                      <span className="text-xs font-medium text-center relative z-10">
                        {t(action.label)}
                      </span>
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
