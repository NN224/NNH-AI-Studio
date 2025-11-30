"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clearInterval } from "timers";

type AutoReplyStats = {
  today: {
    total: number;
    success: number;
    failed: number;
    avgResponseTime: number; // in seconds
  };
  thisWeek: {
    total: number;
    success: number;
    failed: number;
  };
  thisMonth: {
    total: number;
    success: number;
    failed: number;
  };
  recentReplies: Array<{
    id: string;
    reviewId: string;
    rating: number;
    success: boolean;
    responseTime: number;
    createdAt: string;
  }>;
  dailyStats: Array<{
    date: string;
    success: number;
    failed: number;
  }>;
};

export default function AutoReplyMonitoring() {
  const [stats, setStats] = useState<AutoReplyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/auto-pilot/monitoring", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (mounted && data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("[AutoReplyMonitoring] Error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Auto-Reply Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Auto-Reply Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available</p>
            <p className="text-xs mt-1">
              Auto-reply statistics will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRateToday =
    stats.today.total > 0
      ? ((stats.today.success / stats.today.total) * 100).toFixed(1)
      : "0";

  const avgResponseTimeMinutes = Math.floor(stats.today.avgResponseTime / 60);
  const avgResponseTimeSeconds = Math.floor(stats.today.avgResponseTime % 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Auto-Reply Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Success Rate (Today)
            </div>
            <div className="text-2xl font-bold">{successRateToday}%</div>
            <div className="text-xs text-muted-foreground">
              {stats.today.success} of {stats.today.total} replies
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-blue-500" />
              Avg Response Time
            </div>
            <div className="text-2xl font-bold">
              {avgResponseTimeMinutes > 0
                ? `${avgResponseTimeMinutes}m ${avgResponseTimeSeconds}s`
                : `${avgResponseTimeSeconds}s`}
            </div>
            <div className="text-xs text-muted-foreground">Average today</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              This Week
            </div>
            <div className="text-2xl font-bold">{stats.thisWeek.total}</div>
            <div className="text-xs text-muted-foreground">
              {stats.thisWeek.success} successful
            </div>
          </div>
        </div>

        {/* Daily Stats Chart */}
        {stats.dailyStats && stats.dailyStats.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Daily Performance (Last 7 Days)
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: "11px" }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar dataKey="success" fill="#10b981" name="Successful" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Replies */}
        {stats.recentReplies && stats.recentReplies.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Recent Replies</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {stats.recentReplies.slice(0, 5).map((reply) => (
                <div
                  key={reply.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-background/50"
                >
                  <div className="flex items-center gap-2">
                    {reply.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="text-sm">{reply.rating}-star review</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant={reply.success ? "default" : "destructive"}>
                    {reply.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
