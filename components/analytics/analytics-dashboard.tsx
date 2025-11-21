"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLocations } from "@/hooks/use-locations";
import {
  TrendingUp,
  Eye,
  Phone,
  MapPin,
  MousePointerClick,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MetricData {
  date: string;
  views: number;
  searches: number;
  actions: number;
  calls: number;
  websiteClicks: number;
  directionRequests: number;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}

function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-400">{title}</p>
            <h3 className="text-3xl font-bold mt-2">{value}</h3>
            {change && (
              <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {change}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const { locations } = useLocations();
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalViews: 0,
    totalActions: 0,
    totalCalls: 0,
    totalDirections: 0,
  });

  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  useEffect(() => {
    if (!selectedLocation) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/analytics/metrics?locationId=${selectedLocation}&days=30`,
        );
        if (!response.ok) throw new Error("Failed to fetch metrics");

        const data = await response.json();
        setMetricsData(data.chartData || []);
        setTotalStats(data.totals || {});
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedLocation]);

  if (!locations || locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">No locations available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-zinc-400 mt-2">
            Track your Google Business Profile performance
          </p>
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {(location as any).location_name || location.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Views"
              value={totalStats.totalViews.toLocaleString()}
              change="+12.5%"
              icon={<Eye className="w-6 h-6 text-primary" />}
            />
            <StatsCard
              title="Customer Actions"
              value={totalStats.totalActions.toLocaleString()}
              change="+8.3%"
              icon={<MousePointerClick className="w-6 h-6 text-primary" />}
            />
            <StatsCard
              title="Phone Calls"
              value={totalStats.totalCalls.toLocaleString()}
              change="+15.2%"
              icon={<Phone className="w-6 h-6 text-primary" />}
            />
            <StatsCard
              title="Direction Requests"
              value={totalStats.totalDirections.toLocaleString()}
              change="+6.7%"
              icon={<MapPin className="w-6 h-6 text-primary" />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views Trend */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Views"
                    />
                    <Line
                      type="monotone"
                      dataKey="searches"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Searches"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Actions Breakdown */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Customer Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="calls" fill="#f59e0b" name="Calls" />
                    <Bar
                      dataKey="websiteClicks"
                      fill="#8b5cf6"
                      name="Website"
                    />
                    <Bar
                      dataKey="directionRequests"
                      fill="#ec4899"
                      name="Directions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
