"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { motion } from "framer-motion";
import { Minus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Keyword {
  id: string;
  search_keyword: string;
  impressions_count: number;
  month_year: string;
  previous_impressions?: number;
}

// Sample keywords for demo when no real data
const SAMPLE_KEYWORDS = [
  {
    id: "1",
    search_keyword: "restaurant near me",
    impressions_count: 1250,
    month_year: "2024-11",
  },
  {
    id: "2",
    search_keyword: "best food delivery",
    impressions_count: 890,
    month_year: "2024-11",
  },
  {
    id: "3",
    search_keyword: "local business",
    impressions_count: 650,
    month_year: "2024-11",
  },
  {
    id: "4",
    search_keyword: "open now",
    impressions_count: 420,
    month_year: "2024-11",
  },
  {
    id: "5",
    search_keyword: "reviews",
    impressions_count: 380,
    month_year: "2024-11",
  },
];

interface KeywordsCardProps {
  locationId?: string;
  limit?: number;
}

export function KeywordsCard({ locationId, limit = 5 }: KeywordsCardProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(false);

  const fetchKeywords = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!supabase) {
        setKeywords(SAMPLE_KEYWORDS.slice(0, limit));
        setUsingSampleData(true);
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setKeywords(SAMPLE_KEYWORDS.slice(0, limit));
        setUsingSampleData(true);
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from("gmb_search_keywords")
        .select("*")
        .eq("user_id", user.id)
        .order("impressions_count", { ascending: false })
        .limit(limit);

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        logger.error(
          "Error fetching keywords",
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError)),
        );
        // Use sample data on error
        setKeywords(SAMPLE_KEYWORDS.slice(0, limit));
        setUsingSampleData(true);
      } else if (!data || data.length === 0) {
        // Use sample data when empty
        setKeywords(SAMPLE_KEYWORDS.slice(0, limit));
        setUsingSampleData(true);
      } else {
        setKeywords(data);
        setUsingSampleData(false);
      }
    } catch (err) {
      logger.error(
        "Keywords fetch error",
        err instanceof Error ? err : new Error(String(err)),
      );
      setKeywords(SAMPLE_KEYWORDS.slice(0, limit));
      setUsingSampleData(true);
    } finally {
      setIsLoading(false);
    }
  }, [locationId, limit]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (current > previous)
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (current < previous)
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (keywords.length === 0) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-500" />
            Top Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No keyword data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Keywords will appear after syncing with Google
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxImpressions = Math.max(...keywords.map((k) => k.impressions_count));

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-500" />
          Top Keywords
          {usingSampleData && (
            <Badge
              variant="outline"
              className="text-xs text-orange-500 border-orange-500/50"
            >
              Sample
            </Badge>
          )}
          <Badge variant="secondary" className="ml-auto text-xs">
            {keywords.length} keywords
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {keywords.map((keyword, index) => {
          const percentage = (keyword.impressions_count / maxImpressions) * 100;

          return (
            <motion.div
              key={keyword.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[60%] font-medium">
                  {keyword.search_keyword}
                </span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(
                    keyword.impressions_count,
                    keyword.previous_impressions,
                  )}
                  <span className="text-muted-foreground">
                    {formatNumber(keyword.impressions_count)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
