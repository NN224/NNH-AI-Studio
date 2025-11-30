"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
  MessageSquare,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Location data from Google API (before import)
export interface GoogleLocation {
  name: string; // Google resource name (accounts/xxx/locations/xxx)
  title: string; // Business name
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
  categories?: {
    primaryCategory?: {
      displayName?: string;
    };
  };
  metadata?: {
    totalReviewCount?: number;
    starRating?: number;
  };
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
}

interface LocationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: GoogleLocation[];
  _accountId?: string;
  accountName?: string;
  onImport: (selectedLocationIds: string[]) => Promise<void>;
  isImporting?: boolean;
}

export function LocationSelectionDialog({
  open,
  onOpenChange,
  locations,
  _accountId,
  accountName,
  onImport,
  isImporting = false,
}: LocationSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Toggle single location
  const toggleLocation = (locationName: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(locationName)) {
      newSelected.delete(locationName);
    } else {
      newSelected.add(locationName);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === locations.length);
  };

  // Toggle all locations
  const toggleAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(locations.map((l) => l.name)));
      setSelectAll(true);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one location");
      return;
    }

    try {
      await onImport(Array.from(selectedIds));
      onOpenChange(false);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import locations");
    }
  };

  // Format address
  const formatAddress = (location: GoogleLocation): string => {
    const addr = location.storefrontAddress;
    if (!addr) return "No address";

    const parts = [
      addr.addressLines?.join(", "),
      addr.locality,
      addr.administrativeArea,
    ].filter(Boolean);

    return parts.join(", ") || "No address";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Building2 className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-xl text-zinc-100">
                Select Locations to Import
              </DialogTitle>
              {accountName && (
                <p className="text-sm text-zinc-400 mt-0.5">
                  From: {accountName}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="text-zinc-400">
            Choose which business locations you want to manage with NNH AI
            Studio. You can add more locations later.
          </DialogDescription>
        </DialogHeader>

        {/* Select All */}
        <div className="flex items-center justify-between py-3 px-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center gap-3">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={toggleAll}
              className="border-zinc-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium text-zinc-300 cursor-pointer"
            >
              Select All ({locations.length} locations)
            </label>
          </div>
          <span className="text-sm text-orange-400">
            {selectedIds.size} selected
          </span>
        </div>

        {/* Locations List */}
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {locations.map((location) => {
              const isSelected = selectedIds.has(location.name);
              const rating = location.metadata?.starRating;
              const reviewCount = location.metadata?.totalReviewCount;

              return (
                <div
                  key={location.name}
                  onClick={() => toggleLocation(location.name)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "bg-orange-500/10 border-orange-500/50"
                      : "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50",
                  )}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleLocation(location.name)}
                    className="mt-1 border-zinc-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />

                  {/* Location Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={cn(
                          "font-medium truncate",
                          isSelected ? "text-orange-400" : "text-zinc-200",
                        )}
                      >
                        {location.title}
                      </h4>
                      {isSelected && (
                        <Check className="h-4 w-4 text-orange-500 shrink-0" />
                      )}
                    </div>

                    <p className="text-sm text-zinc-500 truncate mb-2">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {formatAddress(location)}
                    </p>

                    {location.categories?.primaryCategory?.displayName && (
                      <p className="text-xs text-zinc-600 mb-2">
                        {location.categories.primaryCategory.displayName}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs">
                      {rating !== undefined && (
                        <div className="flex items-center gap-1 text-zinc-400">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{rating.toFixed(1)}</span>
                        </div>
                      )}
                      {reviewCount !== undefined && (
                        <div className="flex items-center gap-1 text-zinc-400">
                          <MessageSquare className="h-3 w-3" />
                          <span>{reviewCount} reviews</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || isImporting}
            className="gap-2 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Import {selectedIds.size} Location
                {selectedIds.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export a simplified version for adding new locations later
export function AddLocationDialog({
  open,
  onOpenChange,
  availableLocations,
  onImport,
  isImporting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableLocations: GoogleLocation[];
  onImport: (locationId: string) => Promise<void>;
  isImporting?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleImport = async () => {
    if (!selectedId) {
      toast.error("Please select a location");
      return;
    }

    try {
      await onImport(selectedId);
      onOpenChange(false);
      setSelectedId(null);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import location");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add New Location</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Select a location from your Google Business Profile to add.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {availableLocations.map((location) => (
              <div
                key={location.name}
                onClick={() => setSelectedId(location.name)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  selectedId === location.name
                    ? "bg-orange-500/10 border-orange-500/50"
                    : "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50",
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center",
                    selectedId === location.name
                      ? "border-orange-500 bg-orange-500"
                      : "border-zinc-600",
                  )}
                >
                  {selectedId === location.name && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-200 truncate">
                    {location.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {location.categories?.primaryCategory?.displayName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedId || isImporting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add Location"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
