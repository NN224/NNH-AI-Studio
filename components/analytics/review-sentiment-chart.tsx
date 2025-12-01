"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { gmbLogger } from "@/lib/utils/logger";

interface ReviewSentimentChartProps {
  dateRange?: { preset?: string; from: Date; to: Date };
  locationIds?: string[];
}

export function ReviewSentimentChart({
  dateRange,
  locationIds,
}: ReviewSentimentChartProps = {}) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  useEffect(() => {
    async function fetchSentimentData() {
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

        // Get active location IDs
        const { data: locations } = await supabase!
          .from("gmb_locations")
          .select("id")
          .eq("user_id", user.id)
          .in("gmb_account_id", accountIds);

        const locationIds =
          locations?.map((loc) => loc.id).filter(Boolean) || [];

        const { data: reviews, error: queryError } =
          locationIds.length > 0
            ? await supabase!
                .from("gmb_reviews")
                .select("ai_sentiment, created_at, rating")
                .eq("user_id", user.id)
                .in("location_id", locationIds)
                .order("created_at", { ascending: true })
            : { data: [], error: null };

        if (queryError) {
          gmbLogger.error(
            "Error fetching reviews for sentiment",
            queryError instanceof Error
              ? queryError
              : new Error(String(queryError)),
            { userId: user.id },
          );
          // If ai_sentiment column doesn't exist, use rating as fallback
          const { data: reviewsFallback } =
            locationIds.length > 0
              ? await supabase!
                  .from("gmb_reviews")
                  .select("rating, created_at")
                  .eq("user_id", user.id)
                  .in("location_id", locationIds)
                  .order("created_at", { ascending: true })
              : { data: [] };

          if (
            reviewsFallback &&
            Array.isArray(reviewsFallback) &&
            reviewsFallback.length > 0
          ) {
            const monthlyData: Record<
              string,
              { positive: number; neutral: number; negative: number }
            > = {};
            reviewsFallback.forEach((review) => {
              if (!review || !review.created_at) return;
              const date = new Date(review.created_at);
              if (isNaN(date.getTime())) return;

              const monthKey = date.toLocaleDateString("en-US", {
                month: "short",
              });

              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                  positive: 0,
                  neutral: 0,
                  negative: 0,
                };
              }

              // Use rating as sentiment proxy: 4-5 = positive, 3 = neutral, 1-2 = negative
              const rating = review.rating || 0;
              if (rating >= 4) monthlyData[monthKey].positive++;
              else if (rating === 3) monthlyData[monthKey].neutral++;
              else if (rating <= 2) monthlyData[monthKey].negative++;
            });

            const chartData = Object.entries(monthlyData).map(
              ([month, counts]) => ({
                month,
                ...counts,
              }),
            );

            setData(chartData.slice(-6));
          }
          setIsLoading(false);
          return;
        }

        if (reviews && Array.isArray(reviews) && reviews.length > 0) {
          // Group by month and sentiment
          const monthlyData: Record<
            string,
            { positive: number; neutral: number; negative: number }
          > = {};

          reviews.forEach((review) => {
            if (!review || !review.created_at) return;
            const date = new Date(review.created_at);
            if (isNaN(date.getTime())) return;

            const monthKey = date.toLocaleDateString("en-US", {
              month: "short",
            });

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { positive: 0, neutral: 0, negative: 0 };
            }

            const sentiment = review.ai_sentiment;
            if (sentiment === "positive") monthlyData[monthKey].positive++;
            else if (sentiment === "neutral") monthlyData[monthKey].neutral++;
            else if (sentiment === "negative") monthlyData[monthKey].negative++;
          });

          const chartData = Object.entries(monthlyData).map(
            ([month, counts]) => ({
              month,
              ...counts,
            }),
          );

          setData(chartData.slice(-6)); // Last 6 months
        }
      } catch (error) {
        gmbLogger.error(
          "Error fetching sentiment data",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchSentimentData();

    const channel = supabase!
      .channel("sentiment-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gmb_reviews" },
        fetchSentimentData,
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
            Review Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">
          Review Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 107, 53, 0.1)"
            />
            <XAxis
              dataKey="month"
              stroke="#999999"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#999999" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
              }}
            />
            <Legend />
            <Bar dataKey="positive" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="neutral" fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
