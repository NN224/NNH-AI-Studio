import { t } from "@/lib/i18n/stub";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Eye, Star, Shield } from "lucide-react";
import { formatLargeNumber } from "./location-types";

// Stats cards component for locations overview
export const LocationsStats = ({
  totalLocations,
  totalViews,
  avgRating,
  avgHealthScore,
  loading = false,
}: {
  totalLocations: number;
  totalViews: number;
  avgRating: number;
  avgHealthScore: number;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.totalLocations")}
          </CardTitle>
          <MapPin
            className="w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLocations}</div>
          <p className="text-xs text-muted-foreground">
            {t("stats.acrossPlatforms")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.totalViews")}
          </CardTitle>
          <Eye className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatLargeNumber(totalViews)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("stats.last30Days")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.avgRating")}
          </CardTitle>
          <Star className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(avgRating || 0).toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("stats.acrossLocations")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.avgHealthScore")}
          </CardTitle>
          <Shield
            className="w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(avgHealthScore || 0)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {t("stats.optimizationScore")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
