"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, TrendingUp } from "lucide-react";
import { GMBLocation } from "@/lib/types/gmb-types";

interface LocationInsightsCardProps {
  location: GMBLocation;
}

/**
 * Displays insights and key metrics for a GMB location
 */
const LocationInsightsCard = ({ location }: LocationInsightsCardProps) => {
  return (
    <Card className="bg-zinc-900/50 border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Location Insights
          </CardTitle>
          <Badge variant={location.is_active ? "default" : "secondary"}>
            {location.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription>Key metrics and performance data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-zinc-100">{location.location_name}</h3>
          {location.address && (
            <p className="text-sm text-zinc-400 mt-1">{location.address}</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Rating */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-zinc-400">Rating</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {location.rating?.toFixed(1) || 'N/A'}
            </p>
            <p className="text-xs text-zinc-500">out of 5.0</p>
          </div>
          
          {/* Review Count */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-zinc-400">Reviews</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {location.review_count || 0}
            </p>
            <p className="text-xs text-zinc-500">total reviews</p>
          </div>
        </div>
        
        {/* Category */}
        {location.category && (
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <p className="text-xs text-zinc-400 mb-1">Category</p>
            <p className="text-sm font-medium text-zinc-100">{location.category}</p>
          </div>
        )}
        
        {/* Contact Info */}
        <div className="space-y-2">
          {location.phone && (
            <div className="text-sm">
              <span className="text-zinc-400">Phone: </span>
              <span className="text-zinc-200">{location.phone}</span>
            </div>
          )}
          {location.website && (
            <div className="text-sm">
              <span className="text-zinc-400">Website: </span>
              <a 
                href={location.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                Visit website
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

LocationInsightsCard.displayName = "LocationInsightsCard";

export default LocationInsightsCard;
