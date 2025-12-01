"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocationReviews } from "@/hooks/use-locations-cache";
import { Star, MessageSquare, Send, Loader2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLargeNumber } from "@/components/locations/location-types";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface LocationReviewsSectionProps {
  locationId: string;
  locationName: string;
}

export function LocationReviewsSection({
  locationId,
  locationName,
}: LocationReviewsSectionProps) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all");
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const { data, loading, error, refetch } = useLocationReviews(
    locationId,
    page,
  );

  const reviews = data?.reviews || [];
  const stats = data?.stats || {
    total: 0,
    averageRating: 0,
    pendingReplies: 0,
  };
  const pagination = data?.pagination || {
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Filter reviews
  const filteredReviews = reviews.filter((review: any) => {
    if (filter === "pending") return !review.reply_text;
    if (filter === "replied") return !!review.reply_text;
    return true;
  });

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      setReplying(true);
      const response = await fetch(`/api/gmb/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText }),
      });

      if (!response.ok) {
        throw new Error("Failed to send reply");
      }

      toast.success("Reply sent successfully!");
      setSelectedReview(null);
      setReplyText("");
      refetch();
    } catch (error) {
      gmbLogger.error(
        "Reply error",
        error instanceof Error ? error : new Error(String(error)),
        { reviewId, locationId },
      );
      toast.error("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && page === 1) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">
              Error loading reviews
            </p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLargeNumber(stats.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Replies
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReplies}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={filter}
              onValueChange={(value: any) => setFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="pending">Pending Replies</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews ({filteredReviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">
                No reviews found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === "pending"
                  ? "All reviews have been replied to"
                  : "No reviews match the selected filter"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review: any) => (
                <div
                  key={review.id}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (review.rating || 0)
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {review.reviewer?.displayName || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.review_date || review.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {review.review_text || "No comment"}
                      </p>
                    </div>
                  </div>

                  {/* Reply Section */}
                  {review.reply_text ? (
                    <div className="mt-3 p-3 rounded-lg bg-muted">
                      <p className="text-xs font-medium mb-1">Your Reply:</p>
                      <p className="text-sm text-muted-foreground">
                        {review.reply_text}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {selectedReview === review.id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Write your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReply(review.id)}
                              disabled={replying}
                            >
                              {replying ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send Reply
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReview(null);
                                setReplyText("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReview(review.id)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Reply
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrev || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
