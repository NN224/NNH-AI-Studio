"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Base Gradient with Noise */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-noise opacity-[0.02]" />
      </div>

      {/* Mouse-following Gradient */}
      <motion.div
        className="absolute w-96 h-96 bg-gradient-radial from-orange-500/10 to-transparent rounded-full blur-3xl"
        animate={{
          left: `${mousePosition.x - 20}%`,
          top: `${mousePosition.y - 20}%`,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 200,
        }}
      />

      {/* Animated Orange Blob 1 */}
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/20 via-orange-600/15 to-yellow-500/10 rounded-full blur-3xl"
        animate={{
          x: [0, 150, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated Orange Blob 2 */}
      <motion.div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-600/25 via-yellow-500/15 to-orange-500/10 rounded-full blur-3xl"
        animate={{
          x: [0, -120, 0],
          y: [0, -70, 0],
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Animated Purple Accent Blob */}
      <motion.div
        className="absolute top-1/2 right-1/3 w-80 h-80 bg-gradient-to-br from-purple-500/20 via-orange-500/15 to-pink-500/10 rounded-full blur-3xl"
        animate={{
          x: [0, 70, -70, 0],
          y: [0, -100, 100, 0],
          scale: [1, 1.25, 0.9, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />

      {/* Floating Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-orange-400/50 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, -100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Animated Grid Pattern */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.01, 0.03, 0.01] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage: `
            linear-gradient(to right, #f97316 1px, transparent 1px),
            linear-gradient(to bottom, #f97316 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Corner Accent Gradients */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-transparent blur-2xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-orange-600/10 to-transparent blur-2xl" />
    </div>
  );
}
