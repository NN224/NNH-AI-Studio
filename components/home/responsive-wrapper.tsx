"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveWrapper({
  children,
  className = "",
}: ResponsiveWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return (
    <motion.div
      className={`
        ${className}
        ${isMobile ? "mobile-view" : ""}
        ${isTablet ? "tablet-view" : ""}
        ${!isMobile && !isTablet ? "desktop-view" : ""}
      `}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Mobile-first breakpoint utilities
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

// Responsive padding helper
export const responsivePadding = {
  mobile: "px-4 py-3",
  tablet: "sm:px-6 sm:py-4",
  desktop: "lg:px-8 lg:py-6",
  all: "px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6",
};

// Responsive grid helper
export const responsiveGrid = {
  twoColumn: "grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6",
  threeColumn: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6",
  fourColumn: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6",
  sidebar: "grid grid-cols-1 lg:grid-cols-12 gap-6",
};

// Responsive text sizes
export const responsiveText = {
  heading1: "text-2xl sm:text-3xl lg:text-4xl xl:text-5xl",
  heading2: "text-xl sm:text-2xl lg:text-3xl",
  heading3: "text-lg sm:text-xl lg:text-2xl",
  body: "text-sm sm:text-base",
  small: "text-xs sm:text-sm",
};

// Responsive spacing
export const responsiveSpace = {
  section: "space-y-4 sm:space-y-6 lg:space-y-8",
  component: "space-y-3 sm:space-y-4 lg:space-y-6",
  tight: "space-y-2 sm:space-y-3",
};
