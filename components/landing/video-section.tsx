"use client";

import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";

export function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
            Watch Demo
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            See How It Works in 2 Minutes
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Watch a quick walkthrough of NNH AI Studio in action
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Video Container */}
          <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden border border-orange-500/30 shadow-2xl shadow-orange-500/20">
            {!isPlaying ? (
              <>
                {/* Thumbnail */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsPlaying(true)}
                        className="w-24 h-24 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/50 transition-colors mb-4 mx-auto"
                      >
                        <Play
                          className="w-10 h-10 text-white ml-2"
                          fill="white"
                        />
                      </motion.button>
                      <p className="text-white text-lg font-semibold">
                        Watch Product Demo
                      </p>
                      <p className="text-gray-300 text-sm">2:30 minutes</p>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-8 left-8 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-8 right-8 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              </>
            ) : (
              <>
                {/* Video Player */}
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="NNH AI Studio Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />

                {/* Close Button */}
                <button
                  onClick={() => setIsPlaying(false)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors z-10"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-purple-600 rounded-2xl opacity-20 blur-2xl -z-10" />
        </motion.div>

        {/* Video Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto"
        >
          {[
            {
              title: "Quick Setup",
              description: "Get started in under 5 minutes",
            },
            {
              title: "AI in Action",
              description: "See real AI-generated responses",
            },
            {
              title: "Full Walkthrough",
              description: "Complete feature overview",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="text-center p-6 bg-gradient-to-br from-gray-900 to-black border border-orange-500/20 rounded-xl"
            >
              <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
