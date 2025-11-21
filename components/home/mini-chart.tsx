"use client";

import { motion } from "framer-motion";

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  showTrend?: boolean;
}

export function MiniChart({
  data,
  color = "#f97316",
  height = 40,
  showTrend = true,
}: MiniChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Calculate trend
  const trend = data[data.length - 1] > data[0] ? "up" : "down";
  const trendColor = trend === "up" ? "#10b981" : "#ef4444";

  // Generate SVG path
  const width = 100;
  const padding = 4;
  const effectiveHeight = height - padding * 2;
  const effectiveWidth = width - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * effectiveWidth;
    const y =
      padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;

  // Create area path
  const areaPath = `${pathData} L ${effectiveWidth + padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient
            id={`gradient-${color}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#gradient-${color})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={showTrend ? trendColor : color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Points */}
        {data.map((value, index) => {
          const x = padding + (index / (data.length - 1)) * effectiveWidth;
          const y =
            padding +
            effectiveHeight -
            ((value - min) / range) * effectiveHeight;

          return (
            <motion.circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={showTrend ? trendColor : color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// Sparkline - simpler version
export function Sparkline({
  data,
  color = "#f97316",
}: {
  data: number[];
  color?: string;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const width = 60;
  const height = 20;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;

  return (
    <svg width={width} height={height} className="inline-block">
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
    </svg>
  );
}
