"use client";

/**
 * 📊 INSIGHTS DASHBOARD
 *
 * Dashboard for viewing AI proactive insights history.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightCard } from "./insight-card";
import {
  Loader2,
  RefreshCw,
  Filter,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  ProactiveInsight,
  InsightsStats,
} from "@/lib/services/insights-service";

export function InsightsDashboard() {
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");

  const fetchInsights = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      if (filterRead !== "all") params.set("read", filterRead);

      const response = await fetch("/api/ai/insights?" + params.toString());
      const data = await response.json();

      if (data.success) {
        setInsights(data.data.insights || []);
        setStats(data.data.stats || null);
      }
    } catch (error) {
      toast.error("Failed to load insights");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [filterType, filterPriority, filterRead]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/ai/insights/" + id + "/read", {
        method: "POST",
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((insight) =>
            insight.id === id ? { ...insight, isRead: true } : insight,
          ),
        );
        toast.success("Marked as read");
      }
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch("/api/ai/insights/" + id + "/dismiss", {
        method: "POST",
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((insight) =>
            insight.id === id ? { ...insight, isDismissed: true } : insight,
          ),
        );
        toast.success("Insight dismissed");
      }
    } catch (error) {
      toast.error("Failed to dismiss");
    }
  };

  const handleActionTaken = async (id: string, action: string) => {
    try {
      const response = await fetch("/api/ai/insights/" + id + "/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((insight) =>
            insight.id === id
              ? { ...insight, actionTaken: action, isRead: true }
              : insight,
          ),
        );
        toast.success("Action recorded");
      }
    } catch (error) {
      toast.error("Failed to record action");
    }
  };

  const statsCards = [
    {
      title: "Total Insights",
      value: stats?.total || 0,
      icon: Brain,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Unread",
      value: stats?.unread || 0,
      icon: AlertTriangle,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "High Priority",
      value: stats?.byPriority?.high || 0,
      icon: TrendingUp,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Opportunities",
      value: stats?.byType?.opportunity || 0,
      icon: Lightbulb,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Filters:</span>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="problem_detected">
                    Problem Detected
                  </SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="positive_trend">Positive Trend</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="false">Unread Only</SelectItem>
                  <SelectItem value="true">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchInsights(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <AnimatePresence>
          {insights.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No insights found</p>
                <p className="text-sm text-zinc-500 mt-1">
                  AI insights will appear here as they are generated
                </p>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
                onActionTaken={handleActionTaken}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
