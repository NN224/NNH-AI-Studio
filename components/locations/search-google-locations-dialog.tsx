"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Search, MapPin, ExternalLink } from "lucide-react";
import { gmbLogger } from "@/lib/utils/logger";

interface SearchGoogleLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect?: (location: any) => void;
}

export function SearchGoogleLocationsDialog({
  open,
  onOpenChange,
  onLocationSelect,
}: SearchGoogleLocationsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/gmb/google-locations/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          pageSize: 10,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to search locations");
      }

      const data = await response.json();
      setResults(data.googleLocations || []);

      if (data.googleLocations?.length === 0) {
        toast.info("No locations found");
      }
    } catch (error: any) {
      gmbLogger.error(
        "Error searching locations",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error(error.message || "Failed to search locations");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: any) => {
    onLocationSelect?.(location);
    onOpenChange(false);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Search Google Locations
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search for existing Google Business Profile locations to claim or
            view
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by business name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-secondary border-primary/30 text-foreground"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <Label className="text-foreground">Search Results</Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((googleLocation, idx) => {
                  const location = googleLocation.location;
                  const address = location?.storefrontAddress;
                  const addressStr = address
                    ? `${(address.addressLines || []).join(", ")}${
                        address.locality ? `, ${address.locality}` : ""
                      }${address.administrativeArea ? `, ${address.administrativeArea}` : ""}${
                        address.postalCode ? ` ${address.postalCode}` : ""
                      }`
                    : "No address";

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-secondary border border-primary/20 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">
                            {location?.title || "Unnamed Location"}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>{addressStr}</span>
                          </div>
                          {location?.categories?.primaryCategory
                            ?.displayName && (
                            <p className="text-xs text-muted-foreground">
                              Category:{" "}
                              {location.categories.primaryCategory.displayName}
                            </p>
                          )}
                          {googleLocation.requestAdminRightsUri && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                              Already claimed by another user
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {googleLocation.requestAdminRightsUri && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="border-primary/30"
                            >
                              <a
                                href={googleLocation.requestAdminRightsUri}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Request Access
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSelectLocation(googleLocation)}
                            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-primary/20">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSearchQuery("");
              setResults([]);
            }}
            className="border-primary/30"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
