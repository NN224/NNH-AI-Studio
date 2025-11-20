"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function ScreenshotsSection() {
  const screenshots = [
    {
      title: "Dashboard Overview",
      description: "Real-time metrics and insights at a glance",
      icon: "📊",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "AI Review Responses",
      description: "Automated, personalized review replies",
      icon: "⭐",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      title: "Multi-Location Management",
      description: "Manage all your locations from one place",
      icon: "📍",
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Analytics & Reports",
      description: "Detailed insights and performance tracking",
      icon: "📈",
      gradient: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
            Screenshots
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            Explore the Platform
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See real screenshots from our platform in action
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {screenshots.map((screenshot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div
                className={`relative aspect-video bg-gradient-to-br ${screenshot.gradient} rounded-2xl overflow-hidden border border-orange-500/30 hover:border-orange-500 transition-all duration-300 p-8`}
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-8 gap-2 h-full p-4">
                    {[...Array(32)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                        className="bg-white rounded"
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="text-8xl mb-6 filter drop-shadow-lg"
                  >
                    {screenshot.icon}
                  </motion.div>
                  <h4 className="text-2xl font-bold mb-3 text-white drop-shadow-lg">
                    {screenshot.title}
                  </h4>
                  <p className="text-white/90 text-lg max-w-xs">
                    {screenshot.description}
                  </p>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-sm font-semibold">
                    Coming Soon
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div
                className={`absolute -inset-1 bg-gradient-to-r ${screenshot.gradient} rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity -z-10`}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 mb-4">
            Experience the full platform yourself!
          </p>
          <a
            href="/auth/signup"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full transition-colors"
          >
            Start Free Trial
          </a>
        </motion.div>
      </div>
    </section>
  );
}
