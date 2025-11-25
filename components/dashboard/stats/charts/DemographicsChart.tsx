"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { DashboardStats } from "@/lib/services/stats-service";
import { Skeleton } from "@/components/ui/skeleton";

interface DemographicsChartProps {
  data?: DashboardStats["demographics"];
  isLoading: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export function DemographicsChart({ data, isLoading }: DemographicsChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Demographics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
