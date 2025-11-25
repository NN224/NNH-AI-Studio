"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface DemographicData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface DemographicsChartProps {
  data?: DemographicData[];
  isLoading?: boolean;
}

const COLORS = ["#ff6b00", "#2196f3", "#9c27b0", "#4caf50", "#ff9800"];

export function DemographicsChart({ data, isLoading }: DemographicsChartProps) {
  if (isLoading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [
    { name: "5 Stars", value: 0 },
    { name: "4 Stars", value: 0 },
    { name: "3 Stars", value: 0 },
    { name: "2 Stars", value: 0 },
    { name: "1 Star", value: 0 },
  ];

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
        <CardDescription>Breakdown of reviews by star rating</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
