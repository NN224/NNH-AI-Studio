"use client";

import { useState } from "react";
import { useDashboardStats } from "@/hooks/features/use-stats";
import { OverviewStats } from "./stats/charts/OverviewStats";
import { TrendsChart } from "./stats/charts/TrendsChart";
import { DemographicsChart } from "./stats/charts/DemographicsChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

export function InteractiveStatsDashboard() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">(
    "month",
  );
  const { data, isLoading, refetch, isRefetching } = useDashboardStats(period);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your business performance across all locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <OverviewStats
        data={{
          totalReviews: data?.totalReviews,
          averageRating: data?.averageRating,
          totalLocations: data?.totalLocations,
          totalViews: data?.totalViews ?? 0,
        }}
        isLoading={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <TrendsChart data={data?.trends} isLoading={isLoading} />
        <DemographicsChart data={data?.demographics} isLoading={isLoading} />
      </div>
    </div>
  );
}
