"use client"

import { useState, useEffect } from "react"
import { ReviewColumn } from "@/components/reviews/review-column"
import { ReplyDialog } from "@/components/reviews/reply-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import type { GMBReview, GMBLocation } from "@/lib/types/database"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { MessageSquare, RefreshCw } from "lucide-react"

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<GMBReview[]>([])
  const [locations, setLocations] = useState<GMBLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const supabase = createClient()

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from("gmb_locations")
        .select("*")
        .eq("user_id", user.id)

      if (locationsError) {
        console.error('[Reviews Page] Error fetching locations:', locationsError)
      } else if (locationsData) {
        setLocations(locationsData)
      }

      // Fetch reviews
      let query = supabase
        .from("gmb_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (selectedLocation !== "all") {
        query = query.eq("location_id", selectedLocation)
      }

      const { data: reviewsData, error: reviewsError } = await query

      if (reviewsError) {
        console.error('[Reviews Page] Error fetching reviews:', reviewsError)
      } else if (reviewsData) {
        setReviews(reviewsData)
      }
    } catch (error) {
      console.error('[Reviews Page] Unexpected error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("gmb_reviews")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_reviews",
        },
        () => {
          fetchData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedLocation, supabase])

  const handleGenerateResponse = async (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId)
    if (!review) return

    // Update status to in_progress
    await supabase.from("gmb_reviews").update({ status: "in_progress" }).eq("id", reviewId)

    // Open reply dialog
    setSelectedReview(review)
    setReplyDialogOpen(true)
  }

  const handleReply = (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId)
    if (!review) return

    setSelectedReview(review)
    setReplyDialogOpen(true)
  }

  const newReviews = reviews.filter((r) => r.status === "new")
  const inProgressReviews = reviews.filter((r) => r.status === "in_progress")
  const respondedReviews = reviews.filter((r) => r.status === "responded")

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reviews Hub</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to customer reviews</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px] bg-secondary border-primary/30 text-foreground">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent className="bg-card border-primary/30">
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.location_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData()}
            className="border-primary/30 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-3 flex-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="bg-card border border-primary/30 rounded-lg p-4">
                <div className="h-6 w-24 bg-primary/20 rounded shimmer mb-4" />
                <LoadingSkeleton type="review" count={2} />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No reviews yet</h3>
          <p className="text-muted-foreground max-w-md">
            Reviews from your Google My Business locations will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 flex-1 overflow-hidden">
          <ReviewColumn
            title="New"
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
      <ReplyDialog review={selectedReview} open={replyDialogOpen} onOpenChange={setReplyDialogOpen} />
    </div>
  )
}
