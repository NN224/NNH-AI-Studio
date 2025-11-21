"use client";

import { useState, useEffect } from "react";
import { ReviewCard } from "./review-card";
import { ReviewColumn } from "./review-column";
import { ReplyDialog } from "./reply-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Search, Filter, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { toast } from "sonner";
import type { GMBReview } from "@/lib/types/database";

export function ReviewsList() {
  const [reviews, setReviews] = useState<GMBReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase!.auth.getUser();

      if (authError || !user) {
        setError("Please sign in to view reviews");
        setLoading(false);
        return;
      }

      // First get active GMB account IDs and their locations
      const { data: activeAccounts, error: accountsError } = await supabase!
        .from("gmb_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (accountsError) {
        console.error("Error fetching active accounts:", accountsError);
        throw accountsError;
      }

      const activeAccountIds = activeAccounts?.map((acc) => acc.id) || [];

      let activeLocationIds: string[] = [];
      if (activeAccountIds.length > 0) {
        const { data: activeLocations, error: locationsError } = await supabase!
          .from("gmb_locations")
          .select("id")
          .eq("user_id", user.id)
          .in("gmb_account_id", activeAccountIds);

        if (locationsError) {
          console.error("Error fetching active locations:", locationsError);
          throw locationsError;
        }

        activeLocationIds = activeLocations?.map((loc) => loc.id) || [];
      }

      // Only fetch reviews from active locations
      let data = null;
      let fetchError = null;

      if (activeLocationIds.length > 0) {
        console.log(
          `[ReviewsList] Fetching reviews for ${activeLocationIds.length} active locations`,
        );

        const result = await supabase!
          .from("gmb_reviews")
          .select("*")
          .eq("user_id", user.id)
          .in("location_id", activeLocationIds)
          .order("review_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
        data = result.data;
        fetchError = result.error;

        if (fetchError) {
          console.error("[ReviewsList] Error fetching reviews:", fetchError);
        } else {
          console.log(
            `[ReviewsList] Successfully fetched ${data?.length || 0} reviews`,
          );
          if (data && data.length > 0) {
            console.log("[ReviewsList] Sample review:", {
              id: data[0].id,
              rating: data[0].rating,
              reviewer_name: data[0].reviewer_name,
              location_id: data[0].location_id,
              review_text: data[0].review_text?.substring(0, 50) + "...",
            });
          }
        }
      } else {
        // No active locations, return empty array
        console.log("[ReviewsList] No active locations found");
        data = [];
      }

      if (fetchError) {
        throw fetchError;
      }

      setReviews(data || []);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError(err instanceof Error ? err.message : "Failed to load reviews");
      setReviews([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
    toast.success("Reviews refreshed successfully");
  }

  const handleGenerateResponse = async (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    try {
      // Generate AI response
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "review_response",
          context: {
            reviewText: review.review_text || "",
            rating: review.rating,
            sentiment: review.ai_sentiment,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate response");

      const { content } = await response.json();

      // Update the review with generated response
      const { error: updateError } = await supabase
        .from("gmb_reviews")
        .update({
          ai_generated_response: content,
          ai_suggested_reply: content, // Keep both for backwards compatibility
          status: "in_progress",
        })
        .eq("id", reviewId);

      if (updateError) {
        console.error("Error saving AI response:", updateError);
        // Continue anyway - response was generated
      }

      // Refresh reviews to show updated data
      await fetchReviews();
      toast.success("AI response generated successfully");
    } catch (err) {
      console.error("Error generating response:", err);
      toast.error("Failed to generate AI response");
    }
  };

  const handleReply = (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      setSelectedReview(review);
      setReplyDialogOpen(true);
    }
  };

  // Filter reviews based on search and filters
  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      searchQuery === "" ||
      review.reviewer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (review.review_text || "")
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesSentiment =
      filterSentiment === "all" || review.ai_sentiment === filterSentiment;

    const matchesRating =
      filterRating === "all" ||
      (filterRating === "5" && review.rating === 5) ||
      (filterRating === "4" && review.rating === 4) ||
      (filterRating === "3" && review.rating === 3) ||
      (filterRating === "2" && review.rating === 2) ||
      (filterRating === "1" && review.rating === 1);

    return matchesSearch && matchesSentiment && matchesRating;
  });

  // Categorize reviews by status
  const newReviews = filteredReviews.filter((r) => r.status === "new");
  const inProgressReviews = filteredReviews.filter(
    (r) => r.status === "in_progress",
  );
  const respondedReviews = filteredReviews.filter(
    (r) => r.status === "responded",
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reviews</h2>
            <p className="text-muted-foreground">
              Manage and respond to customer reviews
            </p>
          </div>
          <Button disabled className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-destructive/30">
        <CardContent className="p-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <MessageSquare
              className="w-12 h-12 text-destructive"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Error Loading Reviews
              </h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reviews</h2>
          <p className="text-muted-foreground">
            {reviews.length} total {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <Select value={filterSentiment} onValueChange={setFilterSentiment}>
          <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-primary/30">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All sentiments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-primary/30">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {filteredReviews.length === 0 && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {searchQuery ||
                  filterSentiment !== "all" ||
                  filterRating !== "all"
                    ? "No reviews match your filters"
                    : "No reviews yet"}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {searchQuery ||
                  filterSentiment !== "all" ||
                  filterRating !== "all"
                    ? "Try adjusting your filters or search query"
                    : "Reviews from your Google My Business locations will appear here"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List - Single Column Layout */}
      {filteredReviews.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Reviews List - Takes 2/3 of the width */}
          <div className="lg:col-span-2 space-y-4">
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isSelected={selectedReview?.id === review.id}
                onClick={() => {
                  // Check if review needs response
                  const needsResponse =
                    !review.has_reply &&
                    !review.has_response &&
                    !review.reply_text &&
                    !review.review_reply;
                  if (needsResponse) {
                    handleGenerateResponse(review.id);
                  } else {
                    handleReply(review.id);
                  }
                }}
              />
            ))}
          </div>

          {/* Empty Side Columns - Placeholders for future features */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-primary/30 rounded-lg p-4 min-h-[200px]">
              <div className="text-muted-foreground text-sm text-center py-8">
                {/* Placeholder for future widgets */}
              </div>
            </div>
            <div className="bg-card border border-primary/30 rounded-lg p-4 min-h-[200px]">
              <div className="text-muted-foreground text-sm text-center py-8">
                {/* Placeholder for future widgets */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Dialog */}
      {selectedReview && (
        <ReplyDialog
          isOpen={replyDialogOpen}
          onClose={() => {
            setReplyDialogOpen(false);
            setSelectedReview(null);
          }}
          review={selectedReview}
          onSuccess={async () => {
            await fetchReviews();
            toast.success("Reply posted successfully");
            setReplyDialogOpen(false);
            setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
}
