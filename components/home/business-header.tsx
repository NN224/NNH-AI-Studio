"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface BusinessHeaderProps {
  greeting: string;
  firstName: string;
  businessName: string;
  businessLogo?: string;
}

export function BusinessHeader({
  greeting,
  firstName,
  businessName,
  businessLogo,
}: BusinessHeaderProps) {
  // Get emoji based on time
  const hour = new Date().getHours();
  const emoji = hour < 12 ? "☀️" : hour < 18 ? "🌤️" : "🌙";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        {/* Business Logo */}
        {businessLogo ? (
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/10">
            <Image
              src={businessLogo}
              alt={businessName}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-bold text-white">
              {businessName.charAt(0)}
            </span>
          </div>
        )}

        {/* Greeting */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <span>{emoji}</span>
            <span>{greeting},</span>
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="text-gray-400 mt-0.5">
            {businessName} • AI-Powered Dashboard
          </p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <span className="text-sm text-gray-300">AI Online</span>
      </div>
    </motion.div>
  );
}
