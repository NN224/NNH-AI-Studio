"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Info,
  BarChart3,
  PieChartIcon,
  Activity,
  Layers,
  Grid3x3,
  Target,
  Zap,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeStats } from "@/hooks/use-realtime-stats";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InteractiveStatsDashboardProps {
  userId: string;
  initialPeriod?: "day" | "week" | "month" | "year";
}

// Chart themes
const CHART_COLORS = {
  primary: "#ff6b00",
  secondary: "#ffc107",
  success: "#4caf50",
  info: "#2196f3",
  warning: "#ff9800",
  danger: "#f44336",
  purple: "#9c27b0",
  gradient: {
    orange: ["#ff6b00", "#ff8c00"],
    blue: ["#2196f3", "#42a5f5"],
    green: ["#4caf50", "#66bb6a"],
    purple: ["#9c27b0", "#ab47bc"],
  },
};

// Custom animated tooltip
const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-black/95 backdrop-blur-xl border border-orange-500/30 rounded-lg p-3 shadow-xl"
    >
      <p className="text-sm font-medium text-white mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: entry.color }}>
            {entry.name}:
          </span>
          <span className="text-xs font-medium text-white">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
};

// Custom dot for line/area charts
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;

  if (payload.isHighlight) {
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={6}
        fill={CHART_COLORS.primary}
        stroke="#fff"
        strokeWidth={2}
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 0.5 }}
      />
    );
  }

  return null;
};

export function InteractiveStatsDashboard({
  userId,
  initialPeriod = "week",
}: InteractiveStatsDashboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [chartType, setChartType] = useState<
    "overview" | "detailed" | "comparison" | "forecast"
  >("overview");
  const [selectedMetric, setSelectedMetric] = useState<
    "reviews" | "responses" | "ratings" | "growth"
  >("reviews");
  const [isExporting, setIsExporting] = useState(false);

  // Use real-time stats
  const { stats, metrics, isLoading, lastUpdate, refresh } = useRealtimeStats(
    userId,
    {
      refreshInterval: 60000, // 1 minute
      enableWebSocket: true,
    },
  );

  // Generate detailed breakdown data
  const generateDetailedData = (period: string) => {
    return [
      { name: "5 Star", value: 245, percentage: 49 },
      { name: "4 Star", value: 125, percentage: 25 },
      { name: "3 Star", value: 75, percentage: 15 },
      { name: "2 Star", value: 35, percentage: 7 },
      { name: "1 Star", value: 20, percentage: 4 },
    ];
  };

  // Generate comparison data
  const generateComparisonData = () => {
    return [
      { category: "Response Time", current: 85, previous: 72, target: 95 },
      { category: "Response Rate", current: 92, previous: 88, target: 98 },
      { category: "Rating", current: 88, previous: 85, target: 90 },
      { category: "Reviews", current: 78, previous: 70, target: 85 },
      { category: "Growth", current: 82, previous: 75, target: 90 },
    ];
  };

  // Generate forecast data
  const generateForecastData = (historicalData: any[]) => {
    const forecast = historicalData.map((item, index) => ({
      ...item,
      forecast: item.reviews
        ? item.reviews + Math.floor(Math.random() * 20)
        : null,
      confidence: {
        upper: item.reviews ? item.reviews + 30 : null,
        lower: item.reviews ? item.reviews - 10 : null,
      },
    }));

    // Add future predictions
    for (let i = 0; i < 7; i++) {
      const lastValue = forecast[forecast.length - 1].reviews || 50;
      forecast.push({
        name: `+${i + 1}`,
        reviews: null,
        forecast: lastValue + Math.floor(Math.random() * 20),
        confidence: {
          upper: lastValue + 40,
          lower: lastValue,
        },
        isFuture: true,
      });
    }

    return forecast;
  };

  // Generate chart data based on period and metric
  const chartData = useMemo(() => {
    if (!stats)
      return { overview: [], detailed: [], comparison: [], forecast: [] };

    // Mock data generation based on period
    const periods: Record<string, any[]> = {
      day: Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        value: Math.floor(Math.random() * 100),
      })),
      week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        name: day,
        reviews: Math.floor(Math.random() * 50) + 20,
        responses: Math.floor(Math.random() * 45) + 15,
        rating: (Math.random() * 2 + 3).toFixed(1),
        views: Math.floor(Math.random() * 200) + 100,
        isHighlight: day === "Fri",
      })),
      month: Array.from({ length: 30 }, (_, i) => ({
        name: `${i + 1}`,
        reviews: Math.floor(Math.random() * 40) + 10,
        responses: Math.floor(Math.random() * 35) + 8,
        rating: (Math.random() * 2 + 3).toFixed(1),
        growth: Math.floor(Math.random() * 20) - 10,
      })),
      year: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ].map((month) => ({
        name: month,
        reviews: Math.floor(Math.random() * 200) + 100,
        responses: Math.floor(Math.random() * 180) + 80,
        rating: (Math.random() * 1 + 4).toFixed(1),
        growth: Math.floor(Math.random() * 30) - 5,
      })),
    };

    const overviewData = periods[period] || periods.week;

    return {
      overview: overviewData,
      detailed: generateDetailedData(period),
      comparison: generateComparisonData(),
      forecast: generateForecastData(overviewData),
    };
  }, [stats, period]);

  // Export chart data
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = convertToCSV(chartData.overview);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stats-${period}-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    return [headers, ...rows].join("\n");
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Loading analytics...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Controls */}
      <Card className="p-4 border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-orange-800/5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Last Update */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              Interactive Analytics Dashboard
            </h3>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="border-orange-500/30"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="border-orange-500/30"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Chart Type Tabs */}
      <Tabs
        value={chartType}
        onValueChange={(v: any) => setChartType(v)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Forecast
          </TabsTrigger>
        </TabsList>

        {/* Overview Chart */}
        <TabsContent value="overview" className="space-y-6">
          {chartType === "overview" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-6 border-orange-500/30">
                <div className="mb-4">
                  <h4 className="text-lg font-medium">Performance Overview</h4>
                  <p className="text-sm text-muted-foreground">
                    Track your key metrics over time
                  </p>
                </div>

                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.overview}>
                      <defs>
                        <linearGradient
                          id="colorReviews"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={CHART_COLORS.primary}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={CHART_COLORS.primary}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorResponses"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={CHART_COLORS.info}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={CHART_COLORS.info}
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
                      <YAxis
                        yAxisId="left"
                        stroke="#666"
                        tick={{ fill: "#999", fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#666"
                        tick={{ fill: "#999", fontSize: 12 }}
                      />

                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        iconType="rect"
                      />

                      {/* Interactive Brush for zooming */}
                      <Brush
                        dataKey="name"
                        height={30}
                        stroke={CHART_COLORS.primary}
                        fill="#111"
                      />

                      <Bar
                        yAxisId="left"
                        dataKey="views"
                        fill={CHART_COLORS.purple}
                        opacity={0.8}
                        radius={[8, 8, 0, 0]}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="reviews"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorReviews)"
                        dot={<CustomDot />}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="responses"
                        stroke={CHART_COLORS.info}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.info, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="rating"
                        stroke={CHART_COLORS.success}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20"
                  >
                    <p className="text-xs text-muted-foreground">
                      Total Reviews
                    </p>
                    <p className="text-2xl font-bold text-orange-500">
                      {stats?.reviews.total || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">+12.5%</span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  >
                    <p className="text-xs text-muted-foreground">
                      Response Rate
                    </p>
                    <p className="text-2xl font-bold text-blue-500">
                      {metrics?.responseRate || "0%"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">+5%</span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold text-green-500">
                      {stats?.reviews.averageRating.toFixed(1) || "0.0"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">+0.3</span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
                  >
                    <p className="text-xs text-muted-foreground">Views</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {stats?.performance.views || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">+18%</span>
                    </div>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* Detailed Breakdown Chart */}
        <TabsContent value="detailed" className="space-y-6">
          {chartType === "detailed" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="p-6 border-orange-500/30">
                  <h4 className="text-lg font-medium mb-4">
                    Rating Distribution
                  </h4>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.detailed}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.detailed.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  CHART_COLORS.success,
                                  CHART_COLORS.info,
                                  CHART_COLORS.warning,
                                  CHART_COLORS.secondary,
                                  CHART_COLORS.danger,
                                ][index % 5]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 space-y-2">
                    {chartData.detailed.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: [
                                CHART_COLORS.success,
                                CHART_COLORS.info,
                                CHART_COLORS.warning,
                                CHART_COLORS.secondary,
                                CHART_COLORS.danger,
                              ][index % 5],
                            }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.value}</Badge>
                          <span className="text-xs text-muted-foreground">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* Treemap */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="p-6 border-orange-500/30">
                  <h4 className="text-lg font-medium mb-4">Review Sources</h4>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={[
                          {
                            name: "Google",
                            size: 2400,
                            fill: CHART_COLORS.primary,
                          },
                          {
                            name: "Direct",
                            size: 1398,
                            fill: CHART_COLORS.info,
                          },
                          {
                            name: "Mobile",
                            size: 989,
                            fill: CHART_COLORS.success,
                          },
                          {
                            name: "Social",
                            size: 432,
                            fill: CHART_COLORS.purple,
                          },
                          {
                            name: "Other",
                            size: 231,
                            fill: CHART_COLORS.secondary,
                          },
                        ]}
                        dataKey="size"
                        stroke="#fff"
                        fill="#8884d8"
                      />
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <p className="text-xs text-muted-foreground">
                        Most Active
                      </p>
                      <p className="text-sm font-medium">Google (44%)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <p className="text-xs text-muted-foreground">
                        Growth Leader
                      </p>
                      <p className="text-sm font-medium">Mobile (+25%)</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          )}
        </TabsContent>

        {/* Comparison Chart */}
        <TabsContent value="comparison">
          {chartType === "comparison" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 border-orange-500/30">
                <div className="mb-4">
                  <h4 className="text-lg font-medium">
                    Performance Comparison
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Current vs Previous Period vs Target
                  </p>
                </div>

                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData.comparison}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fill: "#999", fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: "#999", fontSize: 10 }}
                      />

                      <Radar
                        name="Previous"
                        dataKey="previous"
                        stroke={CHART_COLORS.secondary}
                        fill={CHART_COLORS.secondary}
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Current"
                        dataKey="current"
                        stroke={CHART_COLORS.primary}
                        fill={CHART_COLORS.primary}
                        fillOpacity={0.5}
                      />
                      <Radar
                        name="Target"
                        dataKey="target"
                        stroke={CHART_COLORS.success}
                        fill={CHART_COLORS.success}
                        fillOpacity={0.2}
                        strokeDasharray="5 5"
                      />

                      <Legend />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Insights */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-medium">Top Performer</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Response Rate improved by 4.5% this period
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-yellow-500" />
                      <p className="text-sm font-medium">Near Target</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reviews are 7% away from monthly target
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-medium">Action Needed</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Growth rate needs 8% boost to hit target
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* Forecast Chart */}
        <TabsContent value="forecast">
          {chartType === "forecast" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-6 border-orange-500/30">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">Predictive Forecast</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-powered predictions for the next 7 days
                    </p>
                  </div>

                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Predictions are based on historical patterns,
                          seasonality, and current trends. Confidence intervals
                          show the range of likely outcomes.
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>

                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.forecast}>
                      <defs>
                        <linearGradient
                          id="colorConfidence"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={CHART_COLORS.info}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={CHART_COLORS.info}
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="name"
                        stroke="#666"
                        tick={{ fill: "#999", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#666"
                        tick={{ fill: "#999", fontSize: 12 }}
                      />

                      <Tooltip content={<CustomTooltip />} />
                      <Legend />

                      {/* Reference line for "today" */}
                      <ReferenceLine
                        x={
                          chartData.forecast[chartData.forecast.length - 8]
                            ?.name
                        }
                        stroke="#666"
                        strokeDasharray="5 5"
                        label="Today"
                      />

                      {/* Confidence interval */}
                      <Area
                        dataKey="confidence.upper"
                        stackId="1"
                        stroke="none"
                        fill="url(#colorConfidence)"
                      />
                      <Area
                        dataKey="confidence.lower"
                        stackId="1"
                        stroke="none"
                        fill="#000"
                      />

                      {/* Historical data */}
                      <Line
                        type="monotone"
                        dataKey="reviews"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={3}
                        dot={{
                          fill: CHART_COLORS.primary,
                          strokeWidth: 2,
                          r: 4,
                        }}
                        name="Actual"
                      />

                      {/* Forecast line */}
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke={CHART_COLORS.success}
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{
                          fill: CHART_COLORS.success,
                          strokeWidth: 2,
                          r: 4,
                        }}
                        name="Forecast"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Forecast Summary */}
                <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium">7-Day Forecast Summary</h5>
                    <Badge
                      variant="outline"
                      className="text-green-500 border-green-500/30"
                    >
                      85% Confidence
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Expected Reviews
                      </p>
                      <p className="text-lg font-bold text-green-500">+312</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Growth Rate
                      </p>
                      <p className="text-lg font-bold text-blue-500">+15.3%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Best Day</p>
                      <p className="text-lg font-bold">Friday</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
