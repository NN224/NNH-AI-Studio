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
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const quickActions = [
  {
    icon: Video,
    label: "uploadVideo",
    href: "/youtube-dashboard",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    hoverColor: "hover:bg-red-500/20",
    borderColor: "hover:border-red-500/50",
    glowColor: "from-red-500/20 to-red-600/20",
  },
  {
    icon: BarChart3,
    label: "viewAnalytics",
    href: "/analytics",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverColor: "hover:bg-blue-500/20",
    borderColor: "hover:border-blue-500/50",
    glowColor: "from-blue-500/20 to-blue-600/20",
  },
  {
    icon: MessageSquare,
    label: "replyReviews",
    href: "/reviews",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    hoverColor: "hover:bg-green-500/20",
    borderColor: "hover:border-green-500/50",
    glowColor: "from-green-500/20 to-green-600/20",
  },
  {
    icon: MapPin,
    label: "manageLocations",
    href: "/locations",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hoverColor: "hover:bg-purple-500/20",
    borderColor: "hover:border-purple-500/50",
    glowColor: "from-purple-500/20 to-purple-600/20",
  },
  {
    icon: FileText,
    label: "createPost",
    href: "/posts",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    hoverColor: "hover:bg-orange-500/20",
    borderColor: "hover:border-orange-500/50",
    glowColor: "from-orange-500/20 to-orange-600/20",
  },
  {
    icon: Sparkles,
    label: "aiStudio",
    href: "/ai-command-center",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    hoverColor: "hover:bg-yellow-500/20",
    borderColor: "hover:border-yellow-500/50",
    glowColor: "from-yellow-500/20 to-yellow-600/20",
  },
];

export function QuickActions() {
  const t = useTranslations("home.quickActions");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const handleClick = (index: number) => {
    setClickedIndex(index);
    setTimeout(() => setClickedIndex(null), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl relative overflow-hidden group">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-purple-500/5 to-blue-500/5"
          animate={{
            x: [0, 100, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={
            hoveredIndex !== null
              ? { translateX: "200%" }
              : { translateX: "-100%" }
          }
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <div className="p-4 relative z-10">
          <motion.div className="flex items-center justify-between mb-4">
            <motion.h2
              className="text-sm font-semibold text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {t("title")}
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-muted-foreground">
                Quick Access
              </span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-2 h-2 bg-orange-500 rounded-full"
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.href}
                variants={item}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <Link href={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    onClick={() => handleClick(index)}
                    className="relative"
                  >
                    <Button
                      variant="outline"
                      className={`w-full h-auto flex-col gap-3 py-4 px-3 border-border/50 ${action.borderColor} ${action.hoverColor} transition-all duration-300 group relative overflow-hidden bg-gradient-to-br from-zinc-900/80 to-black/80`}
                    >
                      {/* Glow effect */}
                      <AnimatePresence>
                        {hoveredIndex === index && (
                          <motion.div
                            className={`absolute -inset-px bg-gradient-to-br ${action.glowColor} blur-lg`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Ripple effect on click */}
                      <AnimatePresence>
                        {clickedIndex === index && (
                          <motion.div
                            className="absolute inset-0 bg-white/10 rounded-lg"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Icon container with animations */}
                      <motion.div
                        className={`p-3 rounded-lg ${action.bgColor} relative z-10 transition-all duration-300`}
                        animate={
                          hoveredIndex === index
                            ? { rotate: [0, -5, 5, -5, 0], scale: 1.1 }
                            : { rotate: 0, scale: 1 }
                        }
                        transition={{ duration: 0.3 }}
                      >
                        {/* Icon pulse effect */}
                        {hoveredIndex === index && (
                          <motion.div
                            className={`absolute inset-0 rounded-lg ${action.bgColor}`}
                            animate={{
                              scale: [1, 1.5, 1.5],
                              opacity: [0.5, 0, 0],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                          />
                        )}
                        <action.icon
                          className={`h-5 w-5 ${action.color} relative z-10 transition-transform duration-300`}
                        />
                      </motion.div>

                      {/* Label with fade effect */}
                      <motion.span
                        className="text-xs font-medium text-center relative z-10 transition-colors duration-300"
                        animate={
                          hoveredIndex === index
                            ? { color: action.color.replace("text-", "#") }
                            : {}
                        }
                      >
                        {t(action.label)}
                      </motion.span>

                      {/* Bottom accent line */}
                      <motion.div
                        className={`absolute bottom-0 left-0 right-0 h-0.5 ${action.bgColor}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: hoveredIndex === index ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      />
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
