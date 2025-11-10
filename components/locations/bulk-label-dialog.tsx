"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6'); // Default blue
  const [creatingLabel, setCreatingLabel] = useState(false);

  // Fetch available labels
  useEffect(() => {
    if (open) {
      fetchLabels();
    }
  }, [open]);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/locations/labels');
      if (!response.ok) throw new Error('Failed to fetch labels');
      const data = await response.json();
      setLabels(data.labels || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
      toast.error('Failed to load labels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Please enter a label name');
      return;
    }

    try {
      setCreatingLabel(true);
      const response = await fetch('/api/locations/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create label');
      }

      const data = await response.json();
      const newLabel = data.label;

      setLabels([...labels, newLabel]);
      setSelectedLabelIds(new Set([...selectedLabelIds, newLabel.id]));
      setNewLabelName('');
      setNewLabelColor('#3b82f6');
      toast.success('Label created successfully');
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create label');
    } finally {
      setCreatingLabel(false);
    }
  };

  const handleToggleLabel = (labelId: string) => {
    const newSet = new Set(selectedLabelIds);
    if (newSet.has(labelId)) {
      newSet.delete(labelId);
    } else {
      newSet.add(labelId);
    }
    setSelectedLabelIds(newSet);
  };

  const handleApplyLabels = async () => {
    if (selectedLabelIds.size === 0) {
      toast.error('Please select at least one label');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/locations/bulk-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationIds,
          labelIds: Array.from(selectedLabelIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply labels');
      }

      toast.success(`Labels applied to ${locationIds.length} location${locationIds.length > 1 ? 's' : ''}`);
      onSuccess();
    } catch (error) {
      console.error('Error applying labels:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply labels');
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
            Select or create labels to apply to {locationIds.length} selected location
            {locationIds.length > 1 ? 's' : ''}
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
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleLabel(label.id)}
                  >
                    <Checkbox
                      checked={selectedLabelIds.has(label.id)}
                      onCheckedChange={() => handleToggleLabel(label.id)}
                    />
                    <Badge
                      style={{
                        backgroundColor: label.color || '#3b82f6',
                        color: 'white',
                      }}
                    >
                      {label.name}
                    </Badge>
                  </div>
                ))}
              </div>
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
                  if (e.key === 'Enter') {
                    handleCreateLabel();
                  }
                }}
              />
              <Input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="w-16"
              />
              <Button
                onClick={handleCreateLabel}
                disabled={creatingLabel || !newLabelName.trim()}
                size="icon"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleApplyLabels} disabled={saving || selectedLabelIds.size === 0}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Labels'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
