"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { gmbLogger } from "@/lib/utils/logger";

interface SearchKeyword {
  search_keyword: string;
  impressions_count: number;
  month_year: string;
}

interface SearchKeywordsProps {
  dateRange?: { preset?: string; from: Date; to: Date };
  locationIds?: string[];
}

export function SearchKeywords({
  dateRange,
  locationIds,
}: SearchKeywordsProps = {}) {
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  useEffect(() => {
    async function fetchKeywords() {
      try {
        // Get current user first
        const {
          data: { user },
        } = await supabase!.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get active account IDs
        const { data: accounts, error: accountsError } = await supabase!
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (accountsError) {
          gmbLogger.error(
            "Error fetching active accounts",
            accountsError instanceof Error
              ? accountsError
              : new Error(String(accountsError)),
            { userId: user.id },
          );
          setIsLoading(false);
          return;
        }

        const accountIds = accounts?.map((acc) => acc.id) || [];
        if (accountIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Get locations
        const { data: locations, error: locationsError } = await supabase!
          .from("gmb_locations")
          .select("id")
          .eq("user_id", user.id)
          .in("gmb_account_id", accountIds);

        if (locationsError) {
          gmbLogger.error(
            "Error fetching locations",
            locationsError instanceof Error
              ? locationsError
              : new Error(String(locationsError)),
            { userId: user.id },
          );
          setIsLoading(false);
          return;
        }

        const locationIds = locations?.map((loc) => loc.id) || [];

        // Get search keywords (last 3 months, top 10 by impressions)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const { data: searchKeywords, error: keywordsError } =
          locationIds.length > 0
            ? await supabase!
                .from("gmb_search_keywords")
                .select("search_keyword, impressions_count, month_year")
                .eq("user_id", user.id)
                .in("location_id", locationIds)
                .gte("month_year", threeMonthsAgo.toISOString().split("T")[0])
                .order("impressions_count", { ascending: false })
                .limit(20)
            : { data: [], error: null };

        if (keywordsError) {
          gmbLogger.error(
            "Error fetching search keywords",
            keywordsError instanceof Error
              ? keywordsError
              : new Error(String(keywordsError)),
            { userId: user.id },
          );
        }

        // Aggregate keywords by summing impressions across months
        const keywordMap = new Map<string, number>();
        if (searchKeywords && Array.isArray(searchKeywords)) {
          searchKeywords.forEach((kw) => {
            if (!kw || !kw.search_keyword) return;
            const keyword = kw.search_keyword;
            const current = keywordMap.get(keyword) || 0;
            const impressions = Number(kw.impressions_count) || 0;
            keywordMap.set(keyword, current + impressions);
          });
        }

        // Convert to array and sort
        const aggregated = Array.from(keywordMap.entries())
          .map(([search_keyword, impressions_count]) => ({
            search_keyword,
            impressions_count,
            month_year: new Date().toISOString().split("T")[0],
          }))
          .sort((a, b) => b.impressions_count - a.impressions_count)
          .slice(0, 10); // Top 10

        setKeywords(aggregated);
      } catch (error) {
        gmbLogger.error(
          "Error fetching search keywords",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchKeywords();

    const channel = supabase!
      .channel("search-keywords")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gmb_search_keywords" },
        fetchKeywords,
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
          <CardTitle className="text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Top Search Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (keywords.length === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Top Search Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No search keywords data available yet</p>
            <p className="text-sm mt-2">
              Data will appear after syncing with Google
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Top Search Keywords
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keywords.map((keyword, index) => (
            <div
              key={keyword.search_keyword}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {keyword.search_keyword}
                  </p>
                </div>
              </div>
              <Badge className="bg-success/20 text-success border-success/30 flex items-center gap-1 ml-2">
                <TrendingUp className="w-3 h-3" />
                {keyword.impressions_count.toLocaleString()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
