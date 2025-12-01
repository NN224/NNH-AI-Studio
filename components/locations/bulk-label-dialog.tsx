"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface Label {
  id: string;
  name: string;
  color?: string;
}

interface BulkLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationIds: string[];
  onSuccess: () => void;
}

export function BulkLabelDialog({
  open,
  onOpenChange,
  locationIds,
  onSuccess,
}: BulkLabelDialogProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6"); // Default blue
  const [creatingLabel, setCreatingLabel] = useState(false);

  useEffect(() => {
    if (open) {
      void fetchLabels();
    } else {
      setSelectedLabelIds(new Set());
      setNewLabelName("");
      setNewLabelColor("#3b82f6");
    }
  }, [open]);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/locations/labels");
      if (!response.ok) throw new Error("Failed to fetch labels");
      const data = await response.json();
      setLabels(data.labels || []);
    } catch (error) {
      gmbLogger.error(
        "Error fetching labels",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("Failed to load labels");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    const trimmedName = newLabelName.trim();
    if (!trimmedName) {
      toast.error("Please enter a label name");
      return;
    }

    try {
      setCreatingLabel(true);
      const response = await fetch("/api/locations/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          color: newLabelColor,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create label");
      }

      const data = await response.json();
      const newLabel = data.label as Label;

      setLabels((prev) => [...prev, newLabel]);
      setSelectedLabelIds((prev) => new Set([...prev, newLabel.id]));
      setNewLabelName("");
      setNewLabelColor("#3b82f6");
      toast.success("Label created successfully");
    } catch (error) {
      gmbLogger.error(
        "Error creating label",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to create label",
      );
    } finally {
      setCreatingLabel(false);
    }
  };

  const handleToggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) {
        next.delete(labelId);
      } else {
        next.add(labelId);
      }
      return next;
    });
  };

  const handleApplyLabels = async () => {
    if (selectedLabelIds.size === 0) {
      toast.error("Please select at least one label");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/locations/bulk-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationIds,
          labelIds: Array.from(selectedLabelIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to apply labels");
      }

      toast.success(
        `Labels applied to ${locationIds.length} location${locationIds.length > 1 ? "s" : ""}`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      gmbLogger.error(
        "Error applying labels",
        error instanceof Error ? error : new Error(String(error)),
        { locationCount: locationIds.length },
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to apply labels",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply Labels</DialogTitle>
          <DialogDescription>
            Select or create labels to apply to {locationIds.length} selected
            location
            {locationIds.length > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Labels */}
          <div className="space-y-3">
            <Label>Select Labels</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : labels.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No labels yet. Create one below.
              </p>
            ) : (
              <ul
                className="space-y-2 max-h-[200px] overflow-y-auto"
                role="listbox"
                aria-label="Available labels"
              >
                {labels.map((label) => (
                  <li
                    key={label.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleLabel(label.id)}
                      className="flex items-center gap-3 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500 rounded-md py-1 px-1"
                      aria-pressed={selectedLabelIds.has(label.id)}
                    >
                      <Checkbox
                        checked={selectedLabelIds.has(label.id)}
                        onCheckedChange={() => handleToggleLabel(label.id)}
                        aria-label={`Toggle label ${label.name}`}
                      />
                      <Badge
                        style={{
                          backgroundColor: label.color || "#3b82f6",
                          color: "white",
                        }}
                      >
                        {label.name}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Create New Label */}
          <div className="space-y-3 pt-4 border-t">
            <Label>Create New Label</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Label name..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateLabel();
                  }
                }}
              />
              <div className="flex flex-col items-center gap-1">
                <Label htmlFor="label-color" className="sr-only">
                  Label color
                </Label>
                <Input
                  id="label-color"
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-16 h-10 p-1"
                  aria-label="Select label color"
                />
              </div>
              <Button
                onClick={handleCreateLabel}
                disabled={creatingLabel || !newLabelName.trim()}
                size="icon"
                type="button"
                aria-label="Create label"
              >
                {creatingLabel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyLabels}
            disabled={saving || selectedLabelIds.size === 0}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Labels"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
