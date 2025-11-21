"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Star, TrendingUp, AlertCircle } from "lucide-react";
import { GMBLocation } from "@/lib/types/gmb-types";
import Link from "next/link";

interface ReviewManagementCardProps {
  location: GMBLocation;
}

/**
 * Displays review management options and statistics for a GMB location
 */
const ReviewManagementCard = ({ location }: ReviewManagementCardProps) => {
  const responseRate = location.response_rate || 0;
  const reviewCount = location.review_count || 0;

  return (
    <Card className="bg-zinc-900/50 border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-orange-500" />
          Review Management
        </CardTitle>
        <CardDescription>
          Manage and respond to customer reviews
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Reviews */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-zinc-400">Total Reviews</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{reviewCount}</p>
            <p className="text-xs text-zinc-500">all time</p>
          </div>

          {/* Response Rate */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-zinc-400">Response Rate</span>
            </div>
            <p
              className={`text-2xl font-bold ${
                responseRate >= 80
                  ? "text-green-400"
                  : responseRate >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {responseRate}%
            </p>
            <p className="text-xs text-zinc-500">of reviews</p>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-300">
                {responseRate < 50 ? "Low Response Rate" : "Good Response Rate"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {responseRate < 50
                  ? "Respond to more reviews to improve customer trust and visibility."
                  : "Keep up the great work responding to customer feedback!"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Link href="/reviews" className="block">
            <Button className="w-full" variant="default">
              <MessageSquare className="h-4 w-4 mr-2" />
              View All Reviews
            </Button>
          </Link>
          <Link href="/reviews?status=pending" className="block">
            <Button className="w-full" variant="outline">
              Respond to Pending Reviews
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

ReviewManagementCard.displayName = "ReviewManagementCard";

export default ReviewManagementCard;
