"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Calendar, TrendingUp } from "lucide-react";
import { GMBLocation } from "@/lib/types/gmb-types";
import Link from "next/link";

interface PostManagementCardProps {
  location: GMBLocation;
}

/**
 * Displays post management options and statistics for a GMB location
 */
const PostManagementCard = ({ location }: PostManagementCardProps) => {
  return (
    <Card className="bg-zinc-900/50 border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          Post Management
        </CardTitle>
        <CardDescription>Create and manage Google posts for {location.location_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-300 mb-1">
                Boost Your Visibility
              </p>
              <p className="text-xs text-zinc-400">
                Regular posts keep your business fresh in Google Search and Maps. 
                Posts with offers or events get 2x more engagement.
              </p>
            </div>
          </div>
        </div>
        
        {/* Post Types Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-zinc-400">What's New</span>
            </div>
            <p className="text-xs text-zinc-300">Share updates and announcements</p>
          </div>
          
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-400" />
              <span className="text-xs text-zinc-400">Event</span>
            </div>
            <p className="text-xs text-zinc-300">Promote upcoming events</p>
          </div>
          
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-zinc-400">Offer</span>
            </div>
            <p className="text-xs text-zinc-300">Share special deals</p>
          </div>
          
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-zinc-400">Product</span>
            </div>
            <p className="text-xs text-zinc-300">Highlight products</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <Link href="/posts" className="block">
            <Button className="w-full" variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Create New Post
            </Button>
          </Link>
          <Link href="/posts" className="block">
            <Button className="w-full" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Manage Existing Posts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

PostManagementCard.displayName = "PostManagementCard";

export default PostManagementCard;
