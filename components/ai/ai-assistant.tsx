"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { aiLogger } from "@/lib/utils/logger";

interface AITip {
  id: string;
  type: "insight" | "recommendation" | "warning";
  title: string;
  message: string;
  action?: string;
  category?: string;
}

export function AIAssistant() {
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);
  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  useEffect(() => {
    const analyzeBusiness = async () => {
      setAnalyzing(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get active GMB accounts
        const { data: accounts } = await supabase
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (!accounts || accounts.length === 0) {
          setAiTips([
            {
              id: "1",
              type: "warning",
              title: "No GMB Account Connected",
              message:
                "Connect your Google My Business account to get personalized AI recommendations and insights.",
            },
          ]);
          setAnalyzing(false);
          return;
        }

        const accountIds = accounts.map((a) => a.id);

        // Get locations data - filter by active accounts only
        const { data: locations, error: locationsError } = await supabase
          .from("gmb_locations")
          .select("id, category, rating, address, location_name")
          .eq("user_id", user.id)
          .in("gmb_account_id", accountIds);

        if (locationsError) {
          aiLogger.error(
            "Error fetching locations",
            locationsError instanceof Error
              ? locationsError
              : new Error(String(locationsError)),
          );
          setAiTips([
            {
              id: "error",
              type: "warning",
              title: "Error Loading Data",
              message:
                "Failed to load location data. Please try refreshing the page.",
            },
          ]);
          setAnalyzing(false);
          return;
        }

        if (!locations || locations.length === 0) {
          setAiTips([
            {
              id: "no-locations",
              type: "warning",
              title: "No Locations Found",
              message:
                "No locations found for your active GMB accounts. Please sync your locations first.",
            },
          ]);
          setAnalyzing(false);
          return;
        }

        // Get reviews data
        const locationIds =
          locations?.map((l: { id: string }) => l.id).filter(Boolean) || [];
        const { data: reviews, error: reviewsError } =
          locationIds.length > 0
            ? await supabase
                .from("gmb_reviews")
                .select(
                  "rating, review_text, comment, ai_sentiment, reply_text, review_reply",
                )
                .eq("user_id", user.id)
                .in("location_id", locationIds)
            : { data: null, error: null };

        if (reviewsError) {
          aiLogger.error(
            "Error fetching reviews",
            reviewsError instanceof Error
              ? reviewsError
              : new Error(String(reviewsError)),
            { userId: user.id },
          );
        }

        // Get performance metrics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: performanceMetrics, error: metricsError } =
          locationIds.length > 0
            ? await supabase
                .from("gmb_performance_metrics")
                .select("metric_type, metric_value, metric_date, location_id")
                .eq("user_id", user.id)
                .in("location_id", locationIds)
                .gte("metric_date", thirtyDaysAgo.toISOString().split("T")[0])
            : { data: null, error: null };

        if (metricsError) {
          aiLogger.error(
            "Error fetching performance metrics",
            metricsError instanceof Error
              ? metricsError
              : new Error(String(metricsError)),
            { userId: user.id },
          );
        }

        // Get search keywords
        const { data: searchKeywords, error: keywordsError } =
          locationIds.length > 0
            ? await supabase
                .from("gmb_search_keywords")
                .select("search_keyword, impressions_count, month_year")
                .eq("user_id", user.id)
                .in("location_id", locationIds)
                .order("impressions_count", { ascending: false })
                .limit(10)
            : { data: null, error: null };

        if (keywordsError) {
          aiLogger.error(
            "Error fetching search keywords",
            keywordsError instanceof Error
              ? keywordsError
              : new Error(String(keywordsError)),
            { userId: user.id },
          );
        }

        // Analyze and generate tips
        const tips: AITip[] = [];

        if (locations && Array.isArray(locations) && locations.length > 0) {
          const validRatings = locations.filter(
            (loc) => loc.rating != null && loc.rating > 0,
          );
          const avgRating =
            validRatings.length > 0
              ? validRatings.reduce((sum, loc) => sum + (loc.rating || 0), 0) /
                validRatings.length
              : 0;
          // Calculate total reviews from reviews array instead of review_count field
          const totalReviews =
            reviews && Array.isArray(reviews) ? reviews.length : 0;

          // Rating insights
          if (avgRating < 4.0) {
            tips.push({
              id: "rating-low",
              type: "warning",
              title: "Average Rating Below 4.0",
              message: `Your average rating is ${avgRating.toFixed(1)}. Focus on improving customer service and addressing negative feedback to boost your rating.`,
              category: "Rating",
            });
          } else if (avgRating >= 4.5) {
            tips.push({
              id: "rating-high",
              type: "insight",
              title: "Excellent Rating",
              message: `Great job! Your average rating of ${avgRating.toFixed(1)} is excellent. Continue maintaining high-quality service.`,
              category: "Rating",
            });
          }

          // Review count insights
          if (totalReviews < 10) {
            tips.push({
              id: "reviews-few",
              type: "recommendation",
              title: "Increase Review Count",
              message: `You have ${totalReviews} reviews. Consider asking satisfied customers to leave reviews to build trust and improve local SEO.`,
              category: "Reviews",
              action: "Ask customers for reviews",
            });
          }

          // Category-specific insights
          const categories = new Set(
            locations
              .map((l: { category?: string }) => l.category)
              .filter(Boolean),
          );
          if (categories.size > 0) {
            const categoryArray = Array.from(categories);
            tips.push({
              id: "category-insight",
              type: "insight",
              title: "Business Category Analysis",
              message: `Your business operates in: ${categoryArray.join(", ")}. Based on your category, consider posting updates about special offers, events, or seasonal promotions.`,
              category: "Category",
            });
          }
        }

        // Reviews sentiment analysis
        if (reviews && Array.isArray(reviews) && reviews.length > 0) {
          const negativeReviews = reviews.filter(
            (r: { rating?: number; ai_sentiment?: string }) => {
              const rating = r.rating || 0;
              const sentiment = r.ai_sentiment;
              return rating <= 2 || sentiment === "negative";
            },
          ).length;

          if (negativeReviews > 0) {
            const negativePercent = (
              (negativeReviews / reviews.length) *
              100
            ).toFixed(1);
            tips.push({
              id: "negative-reviews",
              type: "warning",
              title: "Negative Reviews Detected",
              message: `${negativePercent}% of your reviews are negative. Prioritize responding to these reviews professionally and addressing concerns.`,
              category: "Reviews",
              action: "Respond to negative reviews",
            });
          }

          // Check for unresponded reviews using both reply_text and review_reply for compatibility
          const unrespondedReviews = reviews.filter(
            (r: { reply_text?: string; review_reply?: string }) => {
              return !(r.reply_text || r.review_reply);
            },
          ).length;

          if (unrespondedReviews > reviews.length * 0.2) {
            tips.push({
              id: "unresponded",
              type: "recommendation",
              title: "Review Response Rate",
              message: `${unrespondedReviews} reviews haven't been responded to. Responding to reviews shows engagement and improves customer perception.`,
              category: "Reviews",
              action: "Respond to reviews",
            });
          }
        }

        // Performance metrics insights
        if (
          performanceMetrics &&
          Array.isArray(performanceMetrics) &&
          performanceMetrics.length > 0
        ) {
          type MetricRecord = {
            metric_type?: string;
            metric_value?: number;
            location_id?: string;
          };
          const impressions = performanceMetrics
            .filter(
              (m: MetricRecord) =>
                m &&
                (m.metric_type === "QUERIES_DIRECT" ||
                  m.metric_type === "QUERIES_INDIRECT"),
            )
            .reduce(
              (sum: number, m: MetricRecord) =>
                sum + (Number(m.metric_value) || 0),
              0,
            );

          const clicks = performanceMetrics
            .filter(
              (m: MetricRecord) =>
                m &&
                (m.metric_type === "ACTIONS_WEBSITE" ||
                  m.metric_type === "ACTIONS_PHONE" ||
                  m.metric_type === "ACTIONS_DRIVING_DIRECTIONS"),
            )
            .reduce(
              (sum: number, m: MetricRecord) =>
                sum + (Number(m.metric_value) || 0),
              0,
            );

          if (impressions > 0) {
            const conversionRate = (clicks / impressions) * 100;

            if (impressions > 1000) {
              tips.push({
                id: "high-visibility",
                type: "insight",
                title: "Strong Online Visibility",
                message: `Great! Your business has ${impressions.toLocaleString()} impressions in the last 30 days. You're being discovered online.`,
                category: "Performance",
              });
            } else if (impressions < 100) {
              tips.push({
                id: "low-visibility",
                type: "warning",
                title: "Low Online Visibility",
                message: `Your business has only ${impressions} impressions. Consider optimizing your profile, adding photos, and posting regularly to increase visibility.`,
                category: "Performance",
                action: "Optimize profile",
              });
            }

            if (conversionRate < 2 && impressions > 500) {
              tips.push({
                id: "conversion-opportunity",
                type: "recommendation",
                title: "Improve Click-Through Rate",
                message: `Your conversion rate is ${conversionRate.toFixed(1)}%. Optimize your profile description, add compelling photos, and ensure your hours are accurate to encourage more clicks.`,
                category: "Performance",
                action: "Update profile",
              });
            }
          }
        }

        // Search keywords insights
        if (
          searchKeywords &&
          Array.isArray(searchKeywords) &&
          searchKeywords.length > 0
        ) {
          const topKeyword = searchKeywords[0];
          const totalImpressions = searchKeywords.reduce(
            (sum: number, k: { impressions_count?: number }) =>
              sum + (Number(k.impressions_count) || 0),
            0,
          );

          if (topKeyword && topKeyword.impressions_count > 50) {
            tips.push({
              id: "top-keyword",
              type: "insight",
              title: "Top Search Keyword",
              message: `"${topKeyword.search_keyword}" is your top-performing keyword with ${topKeyword.impressions_count} impressions. Consider creating content around this term to maintain visibility.`,
              category: "SEO",
            });
          }

          if (totalImpressions < 100 && searchKeywords.length > 0) {
            tips.push({
              id: "seo-opportunity",
              type: "recommendation",
              title: "SEO Optimization Opportunity",
              message: `Your search keywords have low total impressions (${totalImpressions}). Optimize your business profile with relevant keywords from your industry to improve discoverability.`,
              category: "SEO",
              action: "Optimize SEO",
            });
          }
        }

        // Location comparison insights
        if (
          locations &&
          Array.isArray(locations) &&
          locations.length > 1 &&
          performanceMetrics &&
          Array.isArray(performanceMetrics) &&
          performanceMetrics.length > 0
        ) {
          const locationPerformance: Record<string, number> = {};
          type MetricItem = {
            metric_type?: string;
            metric_value?: number;
            location_id?: string;
          };
          performanceMetrics.forEach((m: MetricItem) => {
            if (
              m &&
              m.location_id &&
              (m.metric_type === "QUERIES_DIRECT" ||
                m.metric_type === "QUERIES_INDIRECT")
            ) {
              const locationId = m.location_id;
              locationPerformance[locationId] =
                (locationPerformance[locationId] || 0) +
                (Number(m.metric_value) || 0);
            }
          });

          const sortedLocations = Object.entries(locationPerformance).sort(
            ([, a], [, b]) => b - a,
          );
          if (sortedLocations.length > 1) {
            const bestLocationId = sortedLocations[0][0];
            const worstLocationId =
              sortedLocations[sortedLocations.length - 1][0];
            const bestLocation = locations.find(
              (l: { id: string; location_name?: string }) =>
                l.id === bestLocationId,
            );
            const worstLocation = locations.find(
              (l: { id: string; location_name?: string }) =>
                l.id === worstLocationId,
            );

            if (
              bestLocation &&
              worstLocation &&
              sortedLocations[0][1] >
                sortedLocations[sortedLocations.length - 1][1] * 3
            ) {
              tips.push({
                id: "location-disparity",
                type: "warning",
                title: "Location Performance Gap",
                message: `${bestLocation.location_name || "Unknown location"} significantly outperforms ${worstLocation.location_name || "Unknown location"}. Consider applying successful strategies from your best location to improve others.`,
                category: "Performance",
              });
            }
          }
        }

        setAiTips(tips.slice(0, 8)); // Limit to 8 tips (increased from 5)
      } catch (error) {
        aiLogger.error(
          "Error analyzing business",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast.error("Failed to analyze business data");
      } finally {
        setAnalyzing(false);
      }
    };

    analyzeBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setLoading(true);

    try {
      // Call AI API to generate response
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `As an AI assistant for Google My Business management, help the user with: ${userMessage}. Provide helpful, actionable advice.`,
          tone: "helpful",
          contentType: "responses",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            errorData.error ||
            `Failed to generate response (${response.status})`,
        );
      }

      const data = await response.json();

      if (!data || !data.content) {
        throw new Error("Invalid response from AI service");
      }

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      aiLogger.error("Error generating response", err);
      const errorMessage = err.message || "Failed to get AI response";
      toast.error(errorMessage);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err.message && err.message.includes("Invalid response")
              ? "I apologize, but I received an invalid response. Please try again."
              : "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTipIcon = (type: AITip["type"]) => {
    switch (type) {
      case "insight":
        return <Lightbulb className="h-4 w-4 text-primary" />;
      case "recommendation":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getTipColor = (type: AITip["type"]) => {
    switch (type) {
      case "insight":
        return "bg-primary/10 border-primary/30 text-primary";
      case "recommendation":
        return "bg-blue-500/10 border-blue-500/30 text-blue-500";
      case "warning":
        return "bg-orange-500/10 border-orange-500/30 text-orange-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-accent/20">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">AI Assistant</h2>
          <p className="text-muted-foreground">
            Get personalized help and insights for your business
          </p>
        </div>
      </div>

      {/* AI Tips Section */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Insights
          </CardTitle>
          <CardDescription>
            {analyzing
              ? "Analyzing your business data..."
              : "AI-powered insights based on your business profile"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyzing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : aiTips.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {aiTips.map((tip, index) => (
                  <motion.div
                    key={tip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`border ${getTipColor(tip.type)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getTipIcon(tip.type)}</div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{tip.title}</h4>
                              {tip.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {tip.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground/80">
                              {tip.message}
                            </p>
                            {tip.action && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                              >
                                {tip.action}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Connect your GMB account to get AI-powered insights</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Ask AI Anything
          </CardTitle>
          <CardDescription>
            Get instant help with managing your Google Business Profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] mb-4 pr-4">
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation to get AI-powered assistance</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-medium text-foreground">Try asking:</p>
                    <ul className="space-y-1 text-left max-w-md mx-auto">
                      <li>• How can I improve my review response rate?</li>
                      <li>• What posts should I create for my business?</li>
                      <li>• How do I optimize my GMB profile?</li>
                    </ul>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border border-primary/20"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary border border-primary/20 rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask about your business, reviews, posts, or anything else..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
