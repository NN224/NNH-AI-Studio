"use client"

import { Sparkles } from "lucide-react"
import { motion } from "framer-motion"

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8"
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="mb-4"
      >
        <Sparkles className="w-16 h-16 text-orange-500" />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Select a Review to Begin
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Choose a review from the stream to generate AI-powered responses in seconds
      </p>
    </motion.div>
  )
}

