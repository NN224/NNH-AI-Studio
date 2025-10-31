"use client"

import { useState, useEffect } from "react"
import { ReviewColumn } from "./review-column"
import { ReplyDialog } from "./reply-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Search, Filter, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { toast } from "sonner"
import type { GMBReview } from "@/lib/types/database"

export function ReviewsList() {
  const [reviews, setReviews] = useState<GMBReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSentiment, setFilterSentiment] = useState("all")
  const [filterRating, setFilterRating] = useState("all")
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchReviews()
  }, [])

  async function fetchReviews() {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Please sign in to view reviews")
        setLoading(false)
        return
      }

      // First get active GMB account IDs and their locations
      const { data: activeAccounts } = await supabase
        .from("gmb_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)

      const activeAccountIds = activeAccounts?.map(acc => acc.id) || []

      let activeLocationIds: string[] = []
      if (activeAccountIds.length > 0) {
        const { data: activeLocations } = await supabase
          .from("gmb_locations")
          .select("id")
          .eq("user_id", user.id)
          .in("gmb_account_id", activeAccountIds)
        
        activeLocationIds = activeLocations?.map(loc => loc.id) || []
      }

      // Only fetch reviews from active locations
      let data = null
      let fetchError = null
      
      if (activeLocationIds.length > 0) {
        const result = await supabase
          .from("gmb_reviews")
          .select("*")
          .eq("user_id", user.id)
          .in("location_id", activeLocationIds)
          .order("created_at", { ascending: false })
        data = result.data
        fetchError = result.error
      } else {
        // No active locations, return empty array
        data = []
      }

      if (fetchError) {
        throw fetchError
      }

      setReviews(data || [])
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setError(err instanceof Error ? err.message : "Failed to load reviews")
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchReviews()
    setRefreshing(false)
    toast.success("Reviews refreshed successfully")
  }

  const handleGenerateResponse = async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId)
    if (!review) return

    try {
      // Generate AI response
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "review_response",
          context: {
            reviewText: review.comment,
            rating: review.rating,
            sentiment: review.ai_sentiment,
          }
        })
      })

      if (!response.ok) throw new Error("Failed to generate response")

      const { content } = await response.json()

      // Update the review with generated response
      await supabase
        .from("gmb_reviews")
        .update({
          ai_generated_response: content,
          status: "in_progress"
        })
        .eq("id", reviewId)

      // Refresh reviews to show updated data
      await fetchReviews()
      toast.success("AI response generated successfully")
    } catch (err) {
      console.error("Error generating response:", err)
      toast.error("Failed to generate AI response")
    }
  }

  const handleReply = (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId)
    if (review) {
      setSelectedReview(review)
      setReplyDialogOpen(true)
    }
  }

  // Filter reviews based on search and filters
  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = searchQuery === "" || 
      review.reviewer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSentiment = filterSentiment === "all" || 
      review.ai_sentiment === filterSentiment

    const matchesRating = filterRating === "all" || 
      (filterRating === "5" && review.rating === 5) ||
      (filterRating === "4" && review.rating === 4) ||
      (filterRating === "3" && review.rating === 3) ||
      (filterRating === "2" && review.rating === 2) ||
      (filterRating === "1" && review.rating === 1)

    return matchesSearch && matchesSentiment && matchesRating
  })

  // Categorize reviews by status
  const newReviews = filteredReviews.filter(r => r.status === "new")
  const inProgressReviews = filteredReviews.filter(r => r.status === "in_progress")
  const respondedReviews = filteredReviews.filter(r => r.status === "responded")

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reviews</h2>
            <p className="text-muted-foreground">Manage and respond to customer reviews</p>
          </div>
          <Button disabled className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <LoadingSkeleton type="card" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-red-500/30">
        <CardContent className="p-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <MessageSquare className="w-12 h-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Error Loading Reviews</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
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
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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
                  {searchQuery || filterSentiment !== "all" || filterRating !== "all" 
                    ? "No reviews match your filters" 
                    : "No reviews yet"}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {searchQuery || filterSentiment !== "all" || filterRating !== "all"
                    ? "Try adjusting your filters or search query"
                    : "Reviews from your Google My Business locations will appear here"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews Columns */}
      {filteredReviews.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <ReviewColumn
            title="New Reviews"
            status="new"
            reviews={newReviews}
            onGenerateResponse={handleGenerateResponse}
            onReply={handleReply}
          />
          <ReviewColumn
            title="In Progress"
            status="in_progress"
            reviews={inProgressReviews}
            onGenerateResponse={handleGenerateResponse}
            onReply={handleReply}
          />
          <ReviewColumn
            title="Responded"
            status="responded"
            reviews={respondedReviews}
            onGenerateResponse={handleGenerateResponse}
            onReply={handleReply}
          />
        </div>
      )}

      {/* Reply Dialog */}
      {selectedReview && (
        <ReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          review={selectedReview}
          onReply={async (reply) => {
            try {
              await supabase
                .from("gmb_reviews")
                .update({
                  reply_text: reply,
                  status: "responded",
                  updated_at: new Date().toISOString()
                })
                .eq("id", selectedReview.id)

              await fetchReviews()
              toast.success("Reply posted successfully")
              setReplyDialogOpen(false)
              setSelectedReview(null)
            } catch (err) {
              console.error("Error posting reply:", err)
              toast.error("Failed to post reply")
            }
          }}
        />
      )}
    </div>
  )
}