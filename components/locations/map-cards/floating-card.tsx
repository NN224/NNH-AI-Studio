"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FloatingCardProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  children: React.ReactNode;
  delay?: number;
  mobilePosition?: 'top' | 'bottom';
}

/**
 * FloatingCard Component
 * Reusable wrapper for floating cards with glassmorphism effect
 * Responsive: On mobile, cards stack vertically
 */
export function FloatingCard({ 
  position, 
  className = '', 
  children,
  delay = 0,
  mobilePosition = 'top'
}: FloatingCardProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const desktopPositionClasses = {
    'top-left': 'top-[95px] left-[25px]',
    'top-right': 'top-[95px] right-[25px]',
    'bottom-left': 'bottom-[25px] left-[25px]',
    'bottom-right': 'bottom-[25px] right-[25px]',
  };

  // Mobile: Calculate position based on delay (which indicates card order)
  // delay 0.1 = first card (top), 0.2 = second card (below first), etc.
  const getMobileTopPosition = () => {
    if (delay <= 0.15) return 'top-4'; // First card
    if (delay <= 0.25) return 'top-[200px]'; // Second card (below first)
    return 'top-4'; // fallback
  };

  const getMobileBottomPosition = () => {
    if (delay <= 0.35) return 'bottom-[140px]'; // Third card (above last)
    return 'bottom-4'; // Last card
  };

  const mobilePositionClasses = {
    'top': `${getMobileTopPosition()} left-4 right-4`,
    'bottom': `${getMobileBottomPosition()} left-4 right-4`,
  };

  const positionClasses = isMobile 
    ? mobilePositionClasses[mobilePosition]
    : desktopPositionClasses[position];

  const animationVariants = {
    initial: {
      opacity: 0,
      y: 30,
      scale: 0.96,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={animationVariants}
      className={`
        absolute ${positionClasses}
        glass-strong
        rounded-[20px]
        p-4 md:p-6
        shadow-[0_25px_70px_rgba(0,0,0,0.6),0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
        border border-white/8
        z-10
        ${isMobile ? 'w-auto max-w-full' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

