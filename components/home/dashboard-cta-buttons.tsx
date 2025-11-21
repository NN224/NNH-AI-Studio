"use client";

import { motion } from "framer-motion";
import { Link } from "@/lib/navigation";
import { Building2, Play, ArrowRight, Sparkles } from "lucide-react";

export function DashboardCTAButtons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Google My Business Dashboard Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link href="/dashboard">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50">
            {/* Animated background glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Sparkles effect */}
            <div className="absolute top-4 right-4">
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-5 w-5 text-white/40" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 transition-all">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Google My Business
                  </h3>
                  <p className="text-sm text-blue-100">Manage your locations</p>
                </div>
              </div>

              <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                Manage locations, reviews, posts, and insights all in one place
              </p>

              <div className="flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                <span>Open Dashboard</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Border glow effect */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-2xl group-hover:border-white/40 transition-all" />
          </div>
        </Link>
      </motion.div>

      {/* YouTube Dashboard Button */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link href="/youtube-dashboard">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-red-700 p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/50">
            {/* Animated background glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: 0.5,
              }}
            />

            {/* Sparkles effect */}
            <div className="absolute top-4 right-4">
              <motion.div
                animate={{
                  rotate: [360, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-5 w-5 text-white/40" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 transition-all">
                  <Play className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    YouTube Studio
                  </h3>
                  <p className="text-sm text-red-100">Manage your channel</p>
                </div>
              </div>

              <p className="text-sm text-red-100 mb-4 leading-relaxed">
                Upload videos, track analytics, and engage with your audience
              </p>

              <div className="flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                <span>Open Dashboard</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Border glow effect */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-2xl group-hover:border-white/40 transition-all" />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
