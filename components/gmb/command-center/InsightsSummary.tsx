"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Eye, MousePointerClick, Phone, MapPin, Globe } from "lucide-react";
import { LocationMetrics } from "@/hooks/features/use-location-metrics";

interface InsightsSummaryProps {
  insights: LocationMetrics["insights"];
}

export function InsightsSummary({ insights }: InsightsSummaryProps) {
  const metrics = [
    {
      label: "Views",
      value: insights.views,
      icon: Eye,
      color: "text-blue-500",
    },
    {
      label: "Actions",
      value: insights.clicks,
      icon: MousePointerClick,
      color: "text-purple-500",
    },
    {
      label: "Calls",
      value: insights.calls,
      icon: Phone,
      color: "text-green-500",
    },
    {
      label: "Directions",
      value: insights.directions,
      icon: MapPin,
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <metric.icon className={`w-5 h-5 ${metric.color}`} />
            <div>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-xs text-muted-foreground">
                {metric.label}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
