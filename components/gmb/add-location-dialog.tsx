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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { gmbLogger } from "@/lib/utils/logger";
import {
  Building2,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Tag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface GoogleAddress {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}

interface GoogleLocation {
  name: string;
  title?: string;
  storefrontAddress?: GoogleAddress;
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
  categories?: {
    primaryCategory?: {
      displayName?: string;
    };
  };
}

interface AddLocationDialogProps {
  accountId: string;
  onSuccess?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatAddress(address?: GoogleAddress): string | null {
  if (!address) return null;
  const parts = [
    address.addressLines?.join(", "),
    address.locality,
    address.administrativeArea,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ============================================================================
// Component
// ============================================================================

export function AddLocationDialog({
  accountId,
  onSuccess,
}: AddLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<
    GoogleLocation[]
  >([]);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  // Fetch available (not yet imported) locations
  const fetchAvailableLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAvailableLocations([]);
    setSelectedLocations(new Set());

    try {
      const response = await fetch("/api/gmb/locations/available", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to fetch locations",
        );
      }

      const data = await response.json();
      setAvailableLocations(data.locations || []);
    } catch (err) {
      gmbLogger.error(
        "Error fetching available locations",
        err instanceof Error ? err : new Error(String(err)),
      );
      setError(
        err instanceof Error ? err.message : "Failed to fetch locations",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  // Fetch when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailableLocations();
    }
  }, [open, fetchAvailableLocations]);

  // Toggle location selection
  const handleToggleLocation = (locationName: string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationName)) {
        next.delete(locationName);
      } else {
        next.add(locationName);
      }
      return next;
    });
  };

  // Import selected locations
  const handleImport = async () => {
    if (selectedLocations.size === 0) return;

    setIsImporting(true);

    try {
      const locationsToImport = availableLocations.filter((l) =>
        selectedLocations.has(l.name),
      );

      const response = await fetch("/api/gmb/locations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          locations: locationsToImport,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to import locations",
        );
      }

      const result = await response.json();

      toast.success(
        `Successfully added ${result.importedCount} location${result.importedCount !== 1 ? "s" : ""}!`,
      );

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      gmbLogger.error(
        "Error importing locations",
        err instanceof Error ? err : new Error(String(err)),
      );
      toast.error(
        err instanceof Error ? err.message : "Failed to add locations",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Add New Location
          </DialogTitle>
          <DialogDescription>
            Select locations from your Google Business Profile to add to your
            dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchAvailableLocations}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : availableLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">All locations are already added</p>
              <p className="text-sm mt-1">
                You have imported all available locations from this account.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {availableLocations.map((location) => {
                  const isSelected = selectedLocations.has(location.name);
                  const address = formatAddress(location.storefrontAddress);
                  const phone = location.phoneNumbers?.primaryPhone;
                  const category =
                    location.categories?.primaryCategory?.displayName;

                  return (
                    <div
                      key={location.name}
                      onClick={() => handleToggleLocation(location.name)}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                        transition-all duration-200
                        ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          handleToggleLocation(location.name)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {location.title || "Unnamed Location"}
                        </p>
                        {address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{address}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {phone}
                            </span>
                          )}
                          {category && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {category}
                            </span>
                          )}
                          {location.websiteUri && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Website
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedLocations.size === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add{" "}
                {selectedLocations.size > 0
                  ? `(${selectedLocations.size})`
                  : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
