"use client";

import { useMemo } from "react";
import { useGMB } from "@/hooks/use-gmb";
import { GMBConnectionCard } from "./connection/GMBConnectionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
      <Alert
        variant="destructive"
        className="border-red-500/50 bg-red-500/10 text-red-200"
      >
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading GMB Data</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-2">
          <p>
            {error.message ||
              "An unexpected error occurred while fetching GMB data."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="w-fit border-red-500/30 hover:bg-red-500/20 hover:text-red-100"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!memoizedLocations || memoizedLocations.length === 0) {
    return <GMBConnectionCard />;
  }

  return (
    <div className="space-y-6">
      <GMBConnectionCard />

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
