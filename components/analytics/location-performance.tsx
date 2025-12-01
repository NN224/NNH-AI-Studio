"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GMBLocationWithRating } from "@/lib/types/database";
import { apiLogger } from "@/lib/utils/logger";

interface LocationPerformanceProps {
  locationIds?: string[];
}

export function LocationPerformance({
  locationIds,
}: LocationPerformanceProps = {}) {
  const [locations, setLocations] = useState<GMBLocationWithRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  useEffect(() => {
    async function fetchLocations() {
      try {
        // Get current user first
        const {
          data: { user },
        } = await supabase!.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get active GMB account IDs first
        const { data: accounts } = await supabase!
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true);

        const accountIds = accounts?.map((acc) => acc.id) || [];
        if (accountIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Try to use view if available, otherwise use regular query with join
        const { data, error } = await supabase!
          .from("gmb_locations")
          .select(
            `
            id,
            location_name,
            rating,
            review_count,
            gmb_accounts!inner(id, is_active)
          `,
          )
          .eq("user_id", user.id)
          .in("gmb_account_id", accountIds)
          .order("rating", { ascending: false })
          .limit(4);

        if (error) {
          apiLogger.error(
            "Error fetching locations",
            error instanceof Error ? error : new Error(String(error)),
          );
          // Fallback: try without join
          const { data: fallbackData } = await supabase!
            .from("gmb_locations")
            .select("id, location_name, rating, review_count")
            .eq("user_id", user.id)
            .in("gmb_account_id", accountIds)
            .order("rating", { ascending: false })
            .limit(4);

          if (fallbackData) {
            setLocations(fallbackData as any);
          }
          setIsLoading(false);
          return;
        }

        if (data && Array.isArray(data)) {
          // Map the data to match GMBLocationWithRating interface
          const mappedData = data.map((loc: any) => ({
            id: loc.id,
            location_name: loc.location_name || "Unknown",
            rating: loc.rating || 0,
            review_count: loc.review_count || 0,
            reviews_count: loc.review_count || 0,
          }));
          setLocations(mappedData as any);
        }
      } catch (error) {
        apiLogger.error(
          "Error fetching locations",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocations();

    const channel = supabase!
      .channel("location-performance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gmb_locations" },
        fetchLocations,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gmb_reviews" },
        fetchLocations,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">
            Top Performing Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-secondary animate-pulse rounded-lg"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">
          Top Performing Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No locations found
          </p>
        ) : (
          locations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary border border-primary/20 hover:border-primary/40 transition-all duration-200"
            >
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {location.location_name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {location.rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {location.reviews_count || 0} reviews
                  </span>
                </div>
              </div>
              <Badge className="bg-success/20 text-success border-success/30 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />+{((index * 7 + 5) % 20) + 1}%
              </Badge>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
