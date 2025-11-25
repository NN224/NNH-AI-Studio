"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Location } from "@/components/locations/location-types";
import {
  MapPin,
  Star,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Phone,
  Globe,
  Shield,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  getHealthScoreColor,
  getStatusColor,
  formatLargeNumber,
} from "@/components/locations/location-types";
import { Checkbox } from "@/components/ui/checkbox";

interface LocationCardProps {
  location: Location;
  viewMode?: "grid" | "list";
  selected?: boolean;
  onSelect?: () => void;
}

// ✅ PERFORMANCE: Memoize card component to prevent unnecessary re-renders
export const LocationCard = React.memo(
  function LocationCard({
    location,
    viewMode = "grid",
    selected = false,
    onSelect,
  }: LocationCardProps) {
    const router = useRouter();

    if (viewMode === "list") {
      return (
        <Card
          className={cn(
            "hover:shadow-md transition-all",
            selected && "border-primary border-2 bg-primary/5",
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {onSelect && (
                <div className="flex items-center">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={onSelect}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg truncate">
                    {location.name}
                  </h3>
                  <Badge
                    className={cn("text-xs", getStatusColor(location.status))}
                  >
                    {location.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {location.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{location.address}</span>
                    </span>
                  )}
                  {location.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {location.rating.toFixed(1)}
                    </span>
                  )}
                  {location.reviewCount !== undefined && (
                    <span>
                      {formatLargeNumber(location.reviewCount)} reviews
                    </span>
                  )}
                  {location.healthScore !== undefined && (
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        getHealthScoreColor(location.healthScore),
                      )}
                    >
                      <Shield className="w-3 h-3" />
                      {location.healthScore}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/locations/${location.id}`)}
                >
                  View
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/locations/${location.id}/edit`)
                      }
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${location.address}`,
                          "_blank",
                        )
                      }
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Google
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Grid view
    return (
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 border-primary/20 hover:border-primary/40 relative",
          selected && "border-primary border-2 bg-primary/5",
        )}
      >
        {onSelect && (
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={selected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border-2"
            />
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className={cn("flex-1 min-w-0", onSelect && "pl-8")}>
              <h3 className="font-semibold text-base truncate mb-1">
                {location.name}
              </h3>
              <Badge className={cn("text-xs", getStatusColor(location.status))}>
                {location.status}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/locations/${location.id}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/locations/${location.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${location.address}`,
                      "_blank",
                    )
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Google
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address */}
          {location.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{location.address}</span>
            </div>
          )}

          {/* Rating & Reviews */}
          <div className="flex items-center gap-4">
            {location.rating !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="font-medium">
                  {location.rating.toFixed(1)}
                </span>
              </div>
            )}
            {location.reviewCount !== undefined && (
              <span className="text-sm text-muted-foreground">
                {formatLargeNumber(location.reviewCount)} reviews
              </span>
            )}
          </div>

          {/* Health Score */}
          {location.healthScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health Score</span>
                <span
                  className={cn(
                    "font-semibold",
                    getHealthScoreColor(location.healthScore),
                  )}
                >
                  {location.healthScore}%
                </span>
              </div>
              <Progress value={location.healthScore} className="h-2" />
            </div>
          )}

          {/* Contact Info */}
          <div className="flex items-center gap-3 pt-2 border-t">
            {location.phone && (
              <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                <a href={`tel:${location.phone}`}>
                  <Phone className="w-3 h-3" />
                </a>
              </Button>
            )}
            {location.website && (
              <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                <a
                  href={location.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-3 h-3" />
                </a>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/locations/${location.id}`)}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memoization
    return (
      prevProps.location.id === nextProps.location.id &&
      prevProps.location.rating === nextProps.location.rating &&
      prevProps.location.reviewCount === nextProps.location.reviewCount &&
      prevProps.location.healthScore === nextProps.location.healthScore &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.selected === nextProps.selected
    );
  },
);
