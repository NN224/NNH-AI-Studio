"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

interface DemographicData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface DemographicsChartProps {
  data?: DemographicData[];
  isLoading?: boolean;
}

// Colors for each star rating (5 to 1)
const RATING_COLORS = {
  5: { bg: "bg-green-500", text: "text-green-500" },
  4: { bg: "bg-lime-500", text: "text-lime-500" },
  3: { bg: "bg-yellow-500", text: "text-yellow-500" },
  2: { bg: "bg-orange-500", text: "text-orange-500" },
  1: { bg: "bg-red-500", text: "text-red-500" },
};

export function DemographicsChart({ data, isLoading }: DemographicsChartProps) {
  if (isLoading) {
    return (
      <Card className="col-span-3 border-primary/20">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Reorder data: 5 stars first, 1 star last
  const orderedData = data
    ? [...data].sort((a, b) => {
        const aNum = parseInt(a.name) || 0;
        const bNum = parseInt(b.name) || 0;
        return bNum - aNum;
      })
    : [
        { name: "5 Stars", value: 0 },
        { name: "4 Stars", value: 0 },
        { name: "3 Stars", value: 0 },
        { name: "2 Stars", value: 0 },
        { name: "1 Star", value: 0 },
      ];

  const total = orderedData.reduce((sum, d) => sum + d.value, 0);

  // Calculate average rating
  const avgRating =
    total > 0
      ? orderedData.reduce((sum, d) => {
          const stars = parseInt(d.name) || 0;
          return sum + stars * d.value;
        }, 0) / total
      : 0;

  return (
    <Card className="col-span-3 border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Rating Distribution</CardTitle>
            <CardDescription>
              Breakdown of reviews by star rating
            </CardDescription>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-yellow-500">
                {avgRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        {total > 0 && (
          <p className="text-2xl font-bold text-primary mt-2">
            {total}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              total reviews
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground">
            <p>No rating data available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orderedData.map((item) => {
              const stars = parseInt(item.name) || 5;
              const percent =
                total > 0 ? Math.round((item.value / total) * 100) : 0;
              const colors =
                RATING_COLORS[stars as keyof typeof RATING_COLORS] ||
                RATING_COLORS[5];

              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(stars)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 fill-current ${colors.text}`}
                          />
                        ))}
                        {[...Array(5 - stars)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5 text-muted-foreground/30"
                          />
                        ))}
                      </div>
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-8 text-right">
                        {item.value}
                      </span>
                      <span
                        className={`text-xs w-10 text-right ${colors.text}`}
                      >
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${colors.bg} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
