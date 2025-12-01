"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  AlertTriangle,
  Check,
  Loader2,
  Info,
  Shield,
  Clock,
  Globe,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/utils/api-client";
import { FEATURE_CATALOG } from "@/lib/features/feature-definitions";
import { gmbLogger } from "@/lib/utils/logger";

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLocations: Array<{ id: string; name: string }>;
  onComplete?: () => void;
}

interface UpdateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "hours" | "features" | "select";
  icon?: any;
  value: any;
  enabled: boolean;
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  selectedLocations,
  onComplete,
}: BulkUpdateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [validateBefore, setValidateBefore] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [results, setResults] = useState<any>(null);

  const [updateFields, setUpdateFields] = useState<UpdateField[]>([
    {
      key: "shortDescription",
      label: "Short Description",
      type: "textarea",
      icon: Info,
      value: "",
      enabled: false,
    },
    {
      key: "phone",
      label: "Phone Number",
      type: "text",
      icon: Clock,
      value: "",
      enabled: false,
    },
    {
      key: "website",
      label: "Website",
      type: "text",
      icon: Globe,
      value: "",
      enabled: false,
    },
    {
      key: "businessHours",
      label: "Business Hours",
      type: "hours",
      icon: Clock,
      value: {},
      enabled: false,
    },
    {
      key: "features",
      label: "Features & Amenities",
      type: "features",
      icon: Shield,
      value: { amenities: [], payment_methods: [], services: [] },
      enabled: false,
    },
    {
      key: "priceRange",
      label: "Price Range",
      type: "select",
      icon: DollarSign,
      value: "",
      enabled: false,
    },
  ]);

  const toggleField = (index: number) => {
    const newFields = [...updateFields];
    newFields[index].enabled = !newFields[index].enabled;
    setUpdateFields(newFields);
  };

  const updateFieldValue = (index: number, value: any) => {
    const newFields = [...updateFields];
    newFields[index].value = value;
    setUpdateFields(newFields);
  };

  const handleBulkUpdate = async () => {
    setLoading(true);
    setResults(null);

    try {
      // Build updates object from enabled fields
      const updates: Record<string, any> = {};
      updateFields.forEach((field) => {
        if (field.enabled && field.value) {
          updates[field.key] = field.value;
        }
      });

      if (Object.keys(updates).length === 0) {
        toast.error("Please select at least one field to update");
        setLoading(false);
        return;
      }

      const response = await apiClient.post("/api/features/bulk-update", {
        locationIds: selectedLocations.map((loc) => loc.id),
        updates,
        options: {
          validateBefore,
          createBackup,
          dryRun,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bulk update failed");
      }

      setResults(data);

      if (!dryRun) {
        toast.success(
          `Updated ${data.summary.successful} locations successfully`,
        );
        onComplete?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      gmbLogger.error(
        "Bulk update error",
        error instanceof Error ? error : new Error(String(error)),
        { locationCount: selectedLocations.length },
      );
      toast.error("Failed to update locations", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-orange-500" />
            Bulk Update {selectedLocations.length} Locations
          </DialogTitle>
          <DialogDescription>
            Update multiple business attributes across selected locations at
            once
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-6">
            {/* Options */}
            <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dry-run">Dry Run</Label>
                  <p className="text-xs text-muted-foreground">
                    Test changes without applying them
                  </p>
                </div>
                <Switch
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={setDryRun}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="validate">Validate Before Update</Label>
                  <p className="text-xs text-muted-foreground">
                    Check for errors before applying changes
                  </p>
                </div>
                <Switch
                  id="validate"
                  checked={validateBefore}
                  onCheckedChange={setValidateBefore}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="backup">Create Backup</Label>
                  <p className="text-xs text-muted-foreground">
                    Save current state before updating
                  </p>
                </div>
                <Switch
                  id="backup"
                  checked={createBackup}
                  onCheckedChange={setCreateBackup}
                />
              </div>
            </div>

            {/* Update Fields */}
            <div className="space-y-4">
              <h4 className="font-medium">Select Fields to Update</h4>

              {updateFields.map((field, index) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.enabled}
                      onCheckedChange={() => toggleField(index)}
                    />
                    <Label className="flex items-center gap-2">
                      {field.icon && <field.icon className="h-4 w-4" />}
                      {field.label}
                    </Label>
                  </div>

                  {field.enabled && (
                    <div className="ml-8">
                      {field.type === "text" && (
                        <Input
                          value={field.value}
                          onChange={(e) =>
                            updateFieldValue(index, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}

                      {field.type === "textarea" && (
                        <Textarea
                          value={field.value}
                          onChange={(e) =>
                            updateFieldValue(index, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          rows={3}
                        />
                      )}

                      {field.type === "select" &&
                        field.key === "priceRange" && (
                          <select
                            className="w-full px-3 py-2 bg-background border rounded-md"
                            value={field.value}
                            onChange={(e) =>
                              updateFieldValue(index, e.target.value)
                            }
                          >
                            <option value="">Select price range</option>
                            <option value="$">$ - Budget friendly</option>
                            <option value="$$">$$ - Moderate</option>
                            <option value="$$$">$$$ - Upscale</option>
                            <option value="$$$$">$$$$ - Luxury</option>
                          </select>
                        )}

                      {field.type === "features" && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Select features to add (existing features won't be
                            removed)
                          </p>
                          {Object.entries(FEATURE_CATALOG).map(
                            ([category, features]) => (
                              <div key={category} className="space-y-1">
                                <Label className="text-xs">{category}</Label>
                                <div className="flex flex-wrap gap-2">
                                  {features.slice(0, 5).map((feature) => (
                                    <Badge
                                      key={feature.key}
                                      variant="outline"
                                      className="cursor-pointer"
                                      onClick={() => {
                                        const current =
                                          field.value[category] || [];
                                        const updated = current.includes(
                                          feature.key,
                                        )
                                          ? current.filter(
                                              (k: string) => k !== feature.key,
                                            )
                                          : [...current, feature.key];
                                        updateFieldValue(index, {
                                          ...field.value,
                                          [category]: updated,
                                        });
                                      }}
                                    >
                                      {field.value[category]?.includes(
                                        feature.key,
                                      ) && <Check className="h-3 w-3 mr-1" />}
                                      {feature.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      {field.type === "hours" && (
                        <p className="text-sm text-muted-foreground">
                          Business hours editor not implemented yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  {dryRun ? "Dry Run Results" : "Update Results"}
                  {results.summary.successful > 0 && (
                    <Badge variant="default">
                      {results.summary.successful} Success
                    </Badge>
                  )}
                  {results.summary.failed > 0 && (
                    <Badge variant="destructive">
                      {results.summary.failed} Failed
                    </Badge>
                  )}
                </h4>

                {results.results.success.length > 0 && (
                  <div>
                    <Label className="text-sm">Successfully updated:</Label>
                    <ul className="mt-1 space-y-1">
                      {results.results.success.map((loc: any) => (
                        <li
                          key={loc.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="h-3 w-3 text-green-500" />
                          {loc.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.results.failed.length > 0 && (
                  <div>
                    <Label className="text-sm text-destructive">
                      Failed updates:
                    </Label>
                    <ul className="mt-1 space-y-1">
                      {results.results.failed.map((loc: any) => (
                        <li
                          key={loc.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          {loc.name}: {loc.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.summary.backupId && (
                  <p className="text-sm text-muted-foreground">
                    Backup created with ID: {results.summary.backupId}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkUpdate}
            disabled={loading || updateFields.every((f) => !f.enabled)}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {dryRun ? "Test Changes" : "Apply Updates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
