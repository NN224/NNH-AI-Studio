"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { GMBLocation } from "@/lib/types/database";
import { gmbLogger } from "@/lib/utils/logger";

interface GoogleUpdatedInfoProps {
  location: GMBLocation;
}

export function GoogleUpdatedInfo({ location }: GoogleUpdatedInfoProps) {
  const [loading, setLoading] = useState(false);
  const [googleUpdated, setGoogleUpdated] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location) {
      fetchGoogleUpdated();
    }
  }, [location]);

  const fetchGoogleUpdated = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/gmb/location/${location.id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch Google updated information");
      }

      const data = await response.json();
      setGoogleUpdated(data.googleUpdated);
    } catch (error: any) {
      gmbLogger.error(
        "Error fetching Google updated info",
        error instanceof Error ? error : new Error(String(error)),
        { locationId: location.id },
      );
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!location) return null;

  const metadata = (location.metadata as any) || {};
  const hasPendingEdits = metadata.hasPendingEdits;
  const hasGoogleUpdated = metadata.hasGoogleUpdated;

  if (!hasGoogleUpdated && !hasPendingEdits && !googleUpdated) {
    return null;
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Google Updates
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchGoogleUpdated}
            disabled={loading}
            className="border-primary/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !googleUpdated ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {hasPendingEdits && (
              <Alert>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Pending Edits</AlertTitle>
                <AlertDescription>
                  This location has pending edits that haven't been pushed to
                  Maps and Search yet.
                </AlertDescription>
              </Alert>
            )}

            {googleUpdated && (
              <div className="space-y-3">
                {googleUpdated.diffMask && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Fields Updated by Google:
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {googleUpdated.diffMask
                        .split(",")
                        .map((field: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-secondary/50 border-primary/30"
                          >
                            {field.trim()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {googleUpdated.pendingMask && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Fields with Pending Edits:
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {googleUpdated.pendingMask
                        .split(",")
                        .map((field: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-warning/20 border-warning/30 text-warning"
                          >
                            {field.trim()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {googleUpdated.location && (
                  <div className="pt-3 border-t border-primary/20">
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Updated Location Data:
                    </Label>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {googleUpdated.location.title && (
                        <p>
                          <span className="font-medium">Title:</span>{" "}
                          {googleUpdated.location.title}
                        </p>
                      )}
                      {googleUpdated.location.websiteUri && (
                        <p>
                          <span className="font-medium">Website:</span>{" "}
                          {googleUpdated.location.websiteUri}
                        </p>
                      )}
                      {googleUpdated.location.phoneNumbers?.primaryPhone && (
                        <p>
                          <span className="font-medium">Phone:</span>{" "}
                          {googleUpdated.location.phoneNumbers.primaryPhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!googleUpdated.diffMask && !googleUpdated.pendingMask && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    No pending updates from Google
                  </div>
                )}
              </div>
            )}

            {!googleUpdated && hasGoogleUpdated && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Updates Available</AlertTitle>
                <AlertDescription>
                  Google has updates for this location. Click refresh to view
                  them.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
