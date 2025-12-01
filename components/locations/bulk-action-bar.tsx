"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Edit, RefreshCw, Tag, Power, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { BulkLabelDialog } from "./bulk-label-dialog";
import { gmbLogger } from "@/lib/utils/logger";

interface BulkActionBarProps {
  selectedCount: number;
  selectedLocationIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedLocationIds,
  onClearSelection,
  onRefresh,
}: BulkActionBarProps) {
  const [syncing, setSyncing] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleBulkSync = async () => {
    if (selectedLocationIds.length === 0) return;

    try {
      setSyncing(true);
      toast.info(
        `Syncing ${selectedCount} location${selectedCount > 1 ? "s" : ""}...`,
      );

      const response = await fetch("/api/locations/bulk-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds: selectedLocationIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to sync locations");
      }

      const result = await response.json();
      toast.success(
        `Successfully synced ${result.synced || selectedCount} location${selectedCount > 1 ? "s" : ""}!`,
      );
      onRefresh();
      onClearSelection();
    } catch (error) {
      gmbLogger.error(
        "Bulk sync error",
        error instanceof Error ? error : new Error(String(error)),
        { selectedCount, locationIds: selectedLocationIds },
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to sync locations",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (selectedLocationIds.length === 0) return;

    try {
      setProcessing(true);
      const action = isActive ? "reconnect" : "disconnect";
      toast.info(
        `${action === "reconnect" ? "Reconnecting" : "Disconnecting"} ${selectedCount} location${selectedCount > 1 ? "s" : ""}...`,
      );

      const response = await fetch("/api/locations/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationIds: selectedLocationIds,
          updates: { is_active: isActive },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update locations");
      }

      const result = await response.json();
      toast.success(
        `Successfully ${action}ed ${result.updated || selectedCount} location${selectedCount > 1 ? "s" : ""}!`,
      );
      onRefresh();
      onClearSelection();
    } catch (error) {
      gmbLogger.error(
        "Bulk status change error",
        error instanceof Error ? error : new Error(String(error)),
        { selectedCount, action: isActive ? "reconnect" : "disconnect" },
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to update locations",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4 rounded-full shadow-2xl border border-white/20 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            {/* Selection Info */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">
                {selectedCount} location{selectedCount > 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Sync Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkSync}
                disabled={syncing || processing}
                className="bg-white/90 text-primary hover:bg-white"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                />
                Sync
              </Button>

              {/* Label Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowLabelDialog(true)}
                disabled={processing || syncing}
                className="bg-white/90 text-primary hover:bg-white"
              >
                <Tag className="w-4 h-4 mr-2" />
                Labels
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={processing || syncing}
                    className="bg-white/90 text-primary hover:bg-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    More Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => handleBulkStatusChange(false)}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatusChange(true)}
                  >
                    <Power className="w-4 h-4 mr-2 text-green-500" />
                    Reconnect
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <X className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Selection */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Label Dialog */}
      <BulkLabelDialog
        open={showLabelDialog}
        onOpenChange={setShowLabelDialog}
        locationIds={selectedLocationIds}
        onSuccess={() => {
          setShowLabelDialog(false);
          onRefresh();
          onClearSelection();
        }}
      />
    </>
  );
}
