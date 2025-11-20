"use client";

import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import { useState } from "react";

export function DashboardPreviewSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
            See It In Action
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            Powerful Dashboard, Simple Interface
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to manage your business, all in one place
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative group"
        >
          {/* Dashboard Mockup */}
          <div className="relative bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-2xl p-4 shadow-2xl shadow-orange-500/10 overflow-hidden">
            {/* Browser Bar */}
            <div className="bg-gray-800/90 rounded-t-lg p-3 flex items-center gap-2 mb-4 border-b border-gray-700/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
              </div>
              <div className="flex-1 bg-gray-700/50 rounded px-4 py-1.5 text-xs text-gray-400 font-mono">
                app.nnhstudio.com/dashboard
              </div>
            </div>

            {/* Dashboard Content Placeholder */}
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden">
              {/* Grid Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="grid grid-cols-12 gap-4 p-8 h-full">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="bg-orange-500 rounded" />
                  ))}
                </div>
              </div>

              {/* Animated Dashboard Elements */}
              <div className="absolute inset-0 p-6 space-y-4">
                {/* Header with Title */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="h-4 w-32 bg-orange-500/50 rounded mb-2" />
                    <div className="h-6 w-48 bg-white/80 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-orange-500/30 rounded-full" />
                    <div className="h-8 w-8 bg-orange-500/30 rounded-full" />
                  </div>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total Reviews", value: "1,234", trend: "+12%" },
                    { label: "Avg Rating", value: "4.8", trend: "+0.3" },
                    { label: "Response Rate", value: "98%", trend: "+5%" },
                    { label: "Active Locations", value: "12", trend: "+2" },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                    >
                      <div className="h-2 w-16 bg-gray-600 rounded mb-2" />
                      <div className="h-7 w-14 bg-orange-500/60 rounded mb-1" />
                      <div className="h-2 w-10 bg-green-500/40 rounded" />
                    </motion.div>
                  ))}
                </div>

                {/* Main Chart Area */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-800/70 backdrop-blur rounded-lg p-4 border border-orange-500/20 h-40"
                >
                  {/* Chart Title */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-32 bg-white/60 rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-orange-500/30 rounded" />
                      <div className="h-6 w-16 bg-orange-500/30 rounded" />
                    </div>
                  </div>

                  {/* Chart Bars */}
                  <div className="flex items-end justify-between h-24 gap-1.5">
                    {[40, 70, 50, 90, 60, 80, 95, 65, 85, 75, 92, 88].map(
                      (height, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${height}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.6 + i * 0.05, duration: 0.5 }}
                          className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t hover:from-orange-400 hover:to-orange-300 transition-all cursor-pointer"
                        />
                      ),
                    )}
                  </div>
                </motion.div>

                {/* Bottom Row - Recent Activity */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                    className="bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-orange-500/20"
                  >
                    <div className="h-3 w-24 bg-white/60 rounded mb-2" />
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-6 w-6 bg-orange-500/40 rounded-full" />
                          <div className="flex-1">
                            <div className="h-2 w-full bg-gray-600 rounded mb-1" />
                            <div className="h-2 w-3/4 bg-gray-700 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 }}
                    className="bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-orange-500/20"
                  >
                    <div className="h-3 w-28 bg-white/60 rounded mb-2" />
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <div className="h-2 w-20 bg-gray-600 rounded" />
                          <div className="h-2 w-12 bg-green-500/40 rounded" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Interactive Overlay */}
              {!isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] group-hover:bg-black/20 transition-all"
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPlaying(true)}
                    className="relative"
                  >
                    <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 transition-shadow">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 rounded-full bg-orange-500 animate-ping opacity-20" />
                  </motion.button>
                </motion.div>
              )}

              {/* Top Right Icons */}
              <div className="absolute top-4 right-4 flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </motion.div>

                {/* User Avatar */}
                <div className="w-8 h-8 rounded-full bg-orange-500/30 border-2 border-orange-500/50" />
              </div>

              {/* Bottom Right Chat Button (like in screenshot) */}
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute bottom-4 right-4"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/50 cursor-pointer hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity -z-10" />
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
        >
          {[
            "Real-time Analytics",
            "AI-Powered Insights",
            "Multi-location View",
            "Custom Reports",
          ].map((feature, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-sm text-gray-400">{feature}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
