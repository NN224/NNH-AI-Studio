"use client";

import { motion } from "framer-motion";
import { Link } from "@/lib/navigation";
import { Building2, Play, ArrowRight } from "lucide-react";

export function DashboardCTAButtons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Google My Business Dashboard Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Link href="/dashboard">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Google My Business
                  </h3>
                  <p className="text-xs text-blue-200">
                    Locations, reviews & posts
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* YouTube Dashboard Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Link href="/youtube-dashboard">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-700 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Play className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    YouTube Studio
                  </h3>
                  <p className="text-xs text-red-200">Videos & analytics</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
