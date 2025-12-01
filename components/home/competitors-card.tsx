"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/utils/logger";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Competitor {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  types?: string[];
  business_status?: string;
  distance?: number;
}

interface CompetitorsCardProps {
  lat?: number;
  lng?: number;
  categoryName?: string;
  limit?: number;
}

export function CompetitorsCard({
  lat,
  lng,
  categoryName,
  limit = 5,
}: CompetitorsCardProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCompetitors = async () => {
    if (!lat || !lng) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
      });

      if (categoryName) {
        params.append("categoryName", categoryName);
      }

      const response = await fetch(`/api/locations/competitors?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setCompetitors((data.competitors || []).slice(0, limit));
      }
    } catch (err) {
      logger.error(
        "Competitors fetch error",
        err instanceof Error ? err : new Error(String(err)),
      );
      setError("Failed to load competitors");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, [lat, lng, categoryName, limit]);

  const getRatingColor = (rating?: number) => {
    if (!rating) return "text-muted-foreground";
    if (rating >= 4.5) return "text-green-500";
    if (rating >= 4.0) return "text-yellow-500";
    if (rating >= 3.0) return "text-orange-500";
    return "text-red-500";
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!lat || !lng) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-500" />
            Nearby Competitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Select a location to see competitors
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-500" />
            Nearby Competitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchCompetitors}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (competitors.length === 0) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-500" />
            Nearby Competitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No competitors found nearby
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-500" />
            Nearby Competitors
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {competitors.length} found
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={fetchCompetitors}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {competitors.map((competitor, index) => (
          <motion.div
            key={competitor.place_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-purple-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {competitor.name}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(competitor.name)}&query_place_id=${competitor.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Open in Google Maps"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </a>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {competitor.rating && (
                  <span
                    className={`flex items-center gap-0.5 ${getRatingColor(competitor.rating)}`}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    {competitor.rating.toFixed(1)}
                  </span>
                )}
                {competitor.user_ratings_total && (
                  <span>({competitor.user_ratings_total} reviews)</span>
                )}
              </div>
            </div>

            {competitor.rating && (
              <div className="text-right">
                <Badge
                  variant={competitor.rating >= 4.5 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {competitor.rating >= 4.5
                    ? "Top Rated"
                    : competitor.rating >= 4.0
                      ? "Good"
                      : "Average"}
                </Badge>
              </div>
            )}
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
