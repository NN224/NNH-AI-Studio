"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Chart colors
const COLORS = {
  orange: "#ff6b00",
  yellow: "#ffc107",
  green: "#4caf50",
  blue: "#2196f3",
  purple: "#9c27b0",
  red: "#f44336",
  gradient: {
    orange: ["#ff6b00", "#ff8c00"],
    blue: ["#2196f3", "#42a5f5"],
    purple: ["#9c27b0", "#ab47bc"],
  },
};

interface ChartProps {
  data: any[];
  title?: string;
  description?: string;
  trend?: number;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-black/90 backdrop-blur-xl border border-orange-500/30 rounded-lg p-3 shadow-lg"
    >
      <p className="text-sm font-medium text-white mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </motion.div>
  );
};

// Trend indicator component
const TrendIndicator = ({
  value,
  size = "sm",
}: {
  value?: number;
  size?: "sm" | "lg";
}) => {
  if (!value) return null;

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = isPositive
    ? "text-green-500"
    : value < 0
      ? "text-red-500"
      : "text-gray-500";
  const bgColor = isPositive
    ? "bg-green-500/10"
    : value < 0
      ? "bg-red-500/10"
      : "bg-gray-500/10";

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bgColor}`}
    >
      <Icon className={`${size === "lg" ? "h-4 w-4" : "h-3 w-3"} ${color}`} />
      <span
        className={`${size === "lg" ? "text-sm" : "text-xs"} font-medium ${color}`}
      >
        {Math.abs(value)}%
      </span>
    </div>
  );
};

// 1. Line Chart for trends
export function AIInsightLineChart({
  data,
  title,
  description,
  trend,
}: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-orange-800/5">
        {/* Header */}
        {(title || trend) && (
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && <h4 className="text-lg font-semibold">{title}</h4>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <TrendIndicator value={trend} size="lg" />
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <defs>
                <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={COLORS.orange}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.orange}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="name"
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
              />
              <YAxis stroke="#666" tick={{ fill: "#999", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={COLORS.orange}
                strokeWidth={3}
                fill="url(#colorOrange)"
                dot={{ fill: COLORS.orange, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}

// 2. Bar Chart for comparisons
export function AIInsightBarChart({ data, title, description }: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-blue-900/10 via-black to-blue-800/5">
        {/* Header */}
        {title && (
          <div className="mb-4">
            <h4 className="text-lg font-semibold">{title}</h4>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <defs>
                <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8} />
                  <stop
                    offset="95%"
                    stopColor={COLORS.blue}
                    stopOpacity={0.3}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="name"
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
              />
              <YAxis stroke="#666" tick={{ fill: "#999", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill="url(#colorBlue)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}

// 3. Pie Chart for distribution
export function AIInsightPieChart({ data, title, description }: ChartProps) {
  const pieData = data.map((item) => ({
    ...item,
    percentage: (
      (item.value / data.reduce((sum, d) => sum + d.value, 0)) *
      100
    ).toFixed(1),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-purple-900/10 via-black to-purple-800/5">
        {/* Header */}
        {title && (
          <div className="mb-4">
            <h4 className="text-lg font-semibold">{title}</h4>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      [COLORS.orange, COLORS.blue, COLORS.purple, COLORS.green][
                        index % 4
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {pieData.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: [
                    COLORS.orange,
                    COLORS.blue,
                    COLORS.purple,
                    COLORS.green,
                  ][index % 4],
                }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {item.value}
              </Badge>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// 4. Area Chart for cumulative data
export function AIInsightAreaChart({
  data,
  title,
  description,
  trend,
}: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-green-900/10 via-black to-green-800/5">
        {/* Header */}
        {(title || trend) && (
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && <h4 className="text-lg font-semibold">{title}</h4>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <TrendIndicator value={trend} size="lg" />
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={COLORS.green}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.green}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="name"
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
              />
              <YAxis stroke="#666" tick={{ fill: "#999", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS.green}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorGreen)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}

// 5. Radar Chart for multi-dimensional data
export function AIInsightRadarChart({ data, title, description }: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -10 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-yellow-900/10 via-black to-yellow-800/5">
        {/* Header */}
        {title && (
          <div className="mb-4">
            <h4 className="text-lg font-semibold">{title}</h4>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: "#999", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#999", fontSize: 10 }}
              />
              <Radar
                dataKey="value"
                stroke={COLORS.yellow}
                fill={COLORS.yellow}
                fillOpacity={0.4}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}

// 6. Combined Stats Card
export function AIInsightStatsCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  color = "orange",
}: {
  title: string;
  value: string | number;
  change?: number;
  description?: string;
  icon?: React.ElementType;
  color?: keyof typeof COLORS;
}) {
  const bgColor = `from-${color}-900/20 via-black to-${color}-800/10`;
  const borderColor = `border-${color}-500/30`;
  const iconColor = `text-${color}-500`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        className={`p-6 border ${borderColor} bg-gradient-to-br ${bgColor} relative overflow-hidden group`}
      >
        {/* Background decoration */}
        <div
          className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-${color}-500/10 blur-3xl group-hover:scale-150 transition-transform duration-500`}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{title}</p>
            {Icon && (
              <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            )}
          </div>

          {/* Value */}
          <div className="flex items-end justify-between">
            <h3 className={`text-3xl font-bold text-${color}-500`}>{value}</h3>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {change > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : change < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span
                  className={`text-sm font-medium ${
                    change > 0
                      ? "text-green-500"
                      : change < 0
                        ? "text-red-500"
                        : "text-gray-500"
                  }`}
                >
                  {Math.abs(change)}%
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
