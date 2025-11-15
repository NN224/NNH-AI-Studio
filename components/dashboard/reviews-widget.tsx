'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MessageSquare, ArrowRight, Inbox } from 'lucide-react'

interface Review {
  id: string
  reviewer_name: string
  rating: number
  review_text?: string
  created_at: string
  has_reply?: boolean
  review_reply?: string
  location_name?: string
}

interface ReviewsWidgetProps {
  reviews: Review[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export function ReviewsWidget({ reviews }: ReviewsWidgetProps) {
  if (reviews.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            No reviews yet
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Reviews will appear here once customers start reviewing your business
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/reviews">
              View All Reviews
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Recent Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {reviews.slice(0, 5).map((review) => (
          <div
            key={review.id}
            className="border-b last:border-0 pb-4 last:pb-0 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">
                    {review.reviewer_name}
                  </p>
                  <StarRating rating={review.rating} />
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {review.review_text}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{review.location_name || 'Unknown Location'}</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(review.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              
              {!review.has_reply && !review.review_reply && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/reviews?review=${review.id}`}>
                    Reply
                  </Link>
                </Button>
              )}
              
              {(review.has_reply || review.review_reply) && (
                <Badge variant="secondary" className="text-xs">
                  Replied
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard/reviews">
            View All Reviews
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

