"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSelectedLocation,
  type GMBLocation,
} from "@/hooks/use-selected-location";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  ChevronDown,
  MapPin,
  Plus,
  Star,
} from "lucide-react";
import Link from "next/link";

interface LocationSelectorProps {
  className?: string;
  variant?: "default" | "compact" | "minimal";
  showRating?: boolean;
  showAddButton?: boolean;
}

export function LocationSelector({
  className,
  variant = "default",
  showRating = true,
  showAddButton = true,
}: LocationSelectorProps) {
  const {
    selectedLocation,
    selectedLocationId,
    locations,
    locationsCount,
    isLoading,
    selectLocation,
  } = useSelectedLocation();

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-9 w-[180px]" />
      </div>
    );
  }

  // No locations
  if (locationsCount === 0) {
    return (
      <Link href="/settings">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-dashed border-orange-500/50 text-orange-400 hover:bg-orange-500/10",
            className,
          )}
        >
          <Plus className="h-4 w-4" />
          Connect Business
        </Button>
      </Link>
    );
  }

  // Single location - just show it, no dropdown
  if (locationsCount === 1 && selectedLocation) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50",
          className,
        )}
      >
        <MapPin className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-medium text-zinc-200 truncate max-w-[150px]">
          {selectedLocation.location_name}
        </span>
        {showRating && selectedLocation.rating && (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {selectedLocation.rating.toFixed(1)}
          </div>
        )}
      </div>
    );
  }

  // Multiple locations - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === "compact" ? "sm" : "default"}
          className={cn(
            "gap-2 bg-zinc-900/50 border-zinc-700/50 hover:bg-zinc-800/50",
            variant === "minimal" && "border-none bg-transparent",
            className,
          )}
        >
          <MapPin className="h-4 w-4 text-orange-400" />
          <span className="truncate max-w-[120px] sm:max-w-[180px]">
            {selectedLocation?.location_name || "Select Location"}
          </span>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[280px] bg-zinc-900 border-zinc-700"
      >
        <DropdownMenuLabel className="text-zinc-400 text-xs font-normal">
          Your Locations ({locationsCount})
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-700/50" />

        {locations.map((location) => (
          <LocationItem
            key={location.id}
            location={location}
            isSelected={location.id === selectedLocationId}
            showRating={showRating}
            onSelect={() => selectLocation(location.id)}
          />
        ))}

        {showAddButton && (
          <>
            <DropdownMenuSeparator className="bg-zinc-700/50" />
            <DropdownMenuItem asChild>
              <Link
                href="/locations"
                className="flex items-center gap-2 text-orange-400 hover:text-orange-300 cursor-pointer"
              >
                <Building2 className="h-4 w-4" />
                <span>View All Locations</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Individual location item in dropdown
interface LocationItemProps {
  location: GMBLocation;
  isSelected: boolean;
  showRating: boolean;
  onSelect: () => void;
}

function LocationItem({
  location,
  isSelected,
  showRating,
  onSelect,
}: LocationItemProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 py-2.5 cursor-pointer",
        isSelected && "bg-orange-500/10",
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "w-4 h-4 rounded-full border flex items-center justify-center",
          isSelected
            ? "border-orange-500 bg-orange-500"
            : "border-zinc-600 bg-transparent",
        )}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Location info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isSelected ? "text-orange-400" : "text-zinc-200",
          )}
        >
          {location.location_name}
        </p>
        {location.category && (
          <p className="text-xs text-zinc-500 truncate">{location.category}</p>
        )}
      </div>

      {/* Rating */}
      {showRating && location.rating && (
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {location.rating.toFixed(1)}
        </div>
      )}
    </DropdownMenuItem>
  );
}

// Export a minimal version for use in tight spaces
export function LocationSelectorMinimal() {
  return (
    <LocationSelector
      variant="minimal"
      showRating={false}
      showAddButton={false}
    />
  );
}

// Export a compact version for mobile
export function LocationSelectorCompact() {
  return <LocationSelector variant="compact" showAddButton={false} />;
}
