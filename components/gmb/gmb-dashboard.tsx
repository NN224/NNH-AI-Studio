"use client";

import { useMemo } from "react";
import { useGMB } from "@/hooks/use-gmb";
import { GMBConnectionManager } from "./gmb-connection-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal, MapPin } from "lucide-react";
import GMBTabs from "./gmb-dashboard-tabs";

const GMBDashboard = () => {
  const {
    locations,
    isLoading,
    error,
    selectedLocation,
    handleLocationSelect,
  } = useGMB();

  const memoizedLocations = useMemo(() => locations, [locations]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load GMB data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!memoizedLocations || memoizedLocations.length === 0) {
    return <GMBConnectionManager variant="full" />;
  }

  return (
    <div className="space-y-6">
      <GMBConnectionManager variant="compact" />

      {/* Location Selector */}
      {memoizedLocations.length > 1 && (
        <Card className="bg-zinc-900/50 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <MapPin className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-300 mb-2 block">
                  Select Location
                </label>
                <Select
                  value={selectedLocation?.id}
                  onValueChange={handleLocationSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {memoizedLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedLocation ? (
        <GMBTabs location={selectedLocation} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to your GMB Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please select a location from the dropdown above to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

GMBDashboard.displayName = "GMBDashboard";

export default GMBDashboard;
