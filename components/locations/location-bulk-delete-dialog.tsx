"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface LocationBulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationIds: string[];
  locationCount: number;
  onSuccess: () => void;
}

export function LocationBulkDeleteDialog({
  open,
  onOpenChange,
  locationIds,
  locationCount,
  onSuccess,
}: LocationBulkDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      const response = await fetch("/api/locations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ locationIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete locations");
      }

      // Show success message with details
      if (data.warning) {
        toast.warning(data.message, {
          description: data.warning,
        });
      } else {
        toast.success(
          data.message ||
            `Successfully deleted ${locationCount} ${locationCount === 1 ? "location" : "locations"}`,
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      gmbLogger.error(
        "Bulk delete error",
        error instanceof Error ? error : new Error(String(error)),
        { locationCount, locationIds },
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to delete locations",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Locations
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete <strong>{locationCount}</strong>{" "}
            {locationCount === 1 ? "location" : "locations"}?
            <br />
            <span className="text-destructive font-medium">
              This action cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Warning</p>
              <p>
                Deleted locations will be hidden from your dashboard but can be
                restored if needed.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {locationCount}{" "}
                {locationCount === 1 ? "Location" : "Locations"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
