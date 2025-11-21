"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Phone,
  Globe,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GMBLocation } from "@/lib/types/database";

interface EditLocationDialogProps {
  location: GMBLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditLocationDialog({
  location,
  open,
  onOpenChange,
  onSuccess,
}: EditLocationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    primaryPhone: "",
    websiteUri: "",
    addressLines: [] as string[],
    locality: "",
    administrativeArea: "",
    postalCode: "",
    regionCode: "US",
  });

  // Business hours state
  const [businessHours, setBusinessHours] = useState<any[]>([]);

  // Service items state
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [newServiceItem, setNewServiceItem] = useState({
    type: "freeForm" as "freeForm" | "structured",
    category: "",
    displayName: "",
    description: "",
    serviceTypeId: "",
  });

  // Special hours state
  const [specialHours, setSpecialHours] = useState<any[]>([]);
  const [newSpecialHour, setNewSpecialHour] = useState({
    startDate: "",
    endDate: "",
    closed: false,
    openTime: { hours: 9, minutes: 0 },
    closeTime: { hours: 17, minutes: 0 },
  });

  // More hours state
  const [moreHours, setMoreHours] = useState<any[]>([]);
  const [newMoreHours, setNewMoreHours] = useState({
    hoursTypeId: "",
    periods: [] as any[],
  });

  useEffect(() => {
    if (location && open) {
      const metadata = (location.metadata as any) || {};
      const address = metadata.storefrontAddress || {};
      const phoneNumbers = metadata.phoneNumbers || {};
      const profile = metadata.profile || {};
      const regularHours = metadata.regularHours || {};

      setFormData({
        title: location.location_name || "",
        description: profile.description || "",
        primaryPhone: phoneNumbers.primaryPhone || location.phone || "",
        websiteUri: location.website || "",
        addressLines: address.addressLines || [],
        locality: address.locality || "",
        administrativeArea: address.administrativeArea || "",
        postalCode: address.postalCode || "",
        regionCode: address.regionCode || "US",
      });

      setBusinessHours(regularHours.periods || []);

      // Load service items
      setServiceItems(metadata.serviceItems || []);

      // Load special hours
      setSpecialHours(metadata.specialHours?.specialHourPeriods || []);

      // Load more hours
      setMoreHours(metadata.moreHours || []);
    }
  }, [location, open]);

  const handleSubmit = async () => {
    if (!location) return;

    setLoading(true);
    try {
      // Prepare update data based on active tab
      let updateData: any = {};
      let updateMask = "";

      if (activeTab === "basic") {
        updateData = {
          title: formData.title,
          profile: formData.description
            ? { description: formData.description }
            : undefined,
          phoneNumbers: formData.primaryPhone
            ? {
                primaryPhone: formData.primaryPhone,
              }
            : undefined,
          websiteUri: formData.websiteUri || undefined,
        };

        // Build update mask
        const maskParts = ["title"];
        if (formData.description) maskParts.push("profile");
        if (formData.primaryPhone) maskParts.push("phoneNumbers");
        if (formData.websiteUri) maskParts.push("websiteUri");
        updateMask = maskParts.join(",");
      } else if (activeTab === "address") {
        updateData = {
          storefrontAddress: {
            addressLines: formData.addressLines.filter((line) => line.trim()),
            locality: formData.locality || undefined,
            administrativeArea: formData.administrativeArea || undefined,
            postalCode: formData.postalCode || undefined,
            regionCode: formData.regionCode,
          },
        };
        updateMask = "storefrontAddress";
      } else if (activeTab === "hours") {
        updateData = {
          regularHours: {
            periods: businessHours,
          },
        };
        if (specialHours.length > 0) {
          updateData.specialHours = {
            specialHourPeriods: specialHours,
          };
          updateMask = "regularHours,specialHours";
        } else {
          updateMask = "regularHours";
        }
        if (moreHours.length > 0) {
          updateData.moreHours = moreHours;
          updateMask = `${updateMask},moreHours`;
        }
      } else if (activeTab === "services") {
        updateData = {
          serviceItems: serviceItems,
        };
        updateMask = "serviceItems";
      }

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const response = await fetch(`/api/gmb/location/${location.id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updateMask,
          location: updateData,
          validateOnly: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update location");
      }

      toast.success("Location updated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating location:", error);
      toast.error(error.message || "Failed to update location");
    } finally {
      setLoading(false);
    }
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Location</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your business location information
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">
                Business Name *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="bg-secondary border-primary/30 text-foreground"
                placeholder="Your Business Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-secondary border-primary/30 text-foreground min-h-[100px]"
                placeholder="Describe your business..."
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="primaryPhone"
                className="text-foreground flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Primary Phone
              </Label>
              <Input
                id="primaryPhone"
                type="tel"
                value={formData.primaryPhone}
                onChange={(e) =>
                  setFormData({ ...formData, primaryPhone: e.target.value })
                }
                className="bg-secondary border-primary/30 text-foreground"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="websiteUri"
                className="text-foreground flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <Input
                id="websiteUri"
                type="url"
                value={formData.websiteUri}
                onChange={(e) =>
                  setFormData({ ...formData, websiteUri: e.target.value })
                }
                className="bg-secondary border-primary/30 text-foreground"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="address" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label
                htmlFor="addressLines"
                className="text-foreground flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Street Address
              </Label>
              <Textarea
                id="addressLines"
                value={formData.addressLines.join("\n")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    addressLines: e.target.value
                      .split("\n")
                      .filter((line) => line.trim()),
                  })
                }
                className="bg-secondary border-primary/30 text-foreground min-h-[80px]"
                placeholder="Street address line 1&#10;Street address line 2 (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Enter each address line on a new line
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locality" className="text-foreground">
                  City
                </Label>
                <Input
                  id="locality"
                  value={formData.locality}
                  onChange={(e) =>
                    setFormData({ ...formData, locality: e.target.value })
                  }
                  className="bg-secondary border-primary/30 text-foreground"
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="administrativeArea" className="text-foreground">
                  State/Province
                </Label>
                <Input
                  id="administrativeArea"
                  value={formData.administrativeArea}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      administrativeArea: e.target.value,
                    })
                  }
                  className="bg-secondary border-primary/30 text-foreground"
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-foreground">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  className="bg-secondary border-primary/30 text-foreground"
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regionCode" className="text-foreground">
                  Country Code
                </Label>
                <Input
                  id="regionCode"
                  value={formData.regionCode}
                  onChange={(e) =>
                    setFormData({ ...formData, regionCode: e.target.value })
                  }
                  className="bg-secondary border-primary/30 text-foreground"
                  placeholder="US"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Regular Hours */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Regular Business Hours
                </Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Regular operating hours. Editing regular hours requires full
                  time period configuration and will be available in a future
                  update.
                </p>
                {businessHours.length > 0 && (
                  <div className="space-y-2">
                    {businessHours.map((period: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-secondary border border-primary/20"
                      >
                        <p className="text-sm text-foreground">
                          {period.openDay} - {period.closeDay}:{" "}
                          {period.openTime?.hours || 0}:
                          {String(period.openTime?.minutes || 0).padStart(
                            2,
                            "0",
                          )}{" "}
                          - {period.closeTime?.hours || 0}:
                          {String(period.closeTime?.minutes || 0).padStart(
                            2,
                            "0",
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Hours */}
              <div className="space-y-2">
                <Label className="text-foreground">
                  Special Hours (Holidays, etc.)
                </Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Hours that differ from regular hours for specific dates (e.g.,
                  holidays, special events)
                </p>

                {specialHours.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {specialHours.map((period: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-secondary border border-primary/20 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm text-foreground font-medium">
                            {period.closed
                              ? "Closed"
                              : `${period.openTime?.hours || 0}:${String(period.openTime?.minutes || 0).padStart(2, "0")} - ${period.closeTime?.hours || 0}:${String(period.closeTime?.minutes || 0).padStart(2, "0")}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {period.startDate}{" "}
                            {period.endDate &&
                            period.endDate !== period.startDate
                              ? `to ${period.endDate}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSpecialHours(
                              specialHours.filter((_, i) => i !== idx),
                            )
                          }
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-lg bg-secondary border border-primary/20 space-y-3">
                  <Label className="text-foreground">
                    Add Special Hour Period
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Start Date
                      </Label>
                      <Input
                        type="date"
                        value={newSpecialHour.startDate}
                        onChange={(e) =>
                          setNewSpecialHour({
                            ...newSpecialHour,
                            startDate: e.target.value,
                          })
                        }
                        className="bg-card border-primary/30 text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        End Date (optional)
                      </Label>
                      <Input
                        type="date"
                        value={newSpecialHour.endDate}
                        onChange={(e) =>
                          setNewSpecialHour({
                            ...newSpecialHour,
                            endDate: e.target.value,
                          })
                        }
                        className="bg-card border-primary/30 text-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newSpecialHour.closed}
                      onChange={(e) =>
                        setNewSpecialHour({
                          ...newSpecialHour,
                          closed: e.target.checked,
                        })
                      }
                      className="rounded border-primary/30"
                    />
                    <Label className="text-sm text-foreground cursor-pointer">
                      Closed on this date
                    </Label>
                  </div>
                  {!newSpecialHour.closed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Open Time
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={newSpecialHour.openTime.hours}
                            onChange={(e) =>
                              setNewSpecialHour({
                                ...newSpecialHour,
                                openTime: {
                                  ...newSpecialHour.openTime,
                                  hours: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="bg-card border-primary/30 text-foreground"
                            placeholder="Hour"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={newSpecialHour.openTime.minutes}
                            onChange={(e) =>
                              setNewSpecialHour({
                                ...newSpecialHour,
                                openTime: {
                                  ...newSpecialHour.openTime,
                                  minutes: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="bg-card border-primary/30 text-foreground"
                            placeholder="Min"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Close Time
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={newSpecialHour.closeTime.hours}
                            onChange={(e) =>
                              setNewSpecialHour({
                                ...newSpecialHour,
                                closeTime: {
                                  ...newSpecialHour.closeTime,
                                  hours: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="bg-card border-primary/30 text-foreground"
                            placeholder="Hour"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={newSpecialHour.closeTime.minutes}
                            onChange={(e) =>
                              setNewSpecialHour({
                                ...newSpecialHour,
                                closeTime: {
                                  ...newSpecialHour.closeTime,
                                  minutes: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="bg-card border-primary/30 text-foreground"
                            placeholder="Min"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newSpecialHour.startDate) {
                        const period: any = {
                          startDate: {
                            year: parseInt(
                              newSpecialHour.startDate.split("-")[0],
                            ),
                            month: parseInt(
                              newSpecialHour.startDate.split("-")[1],
                            ),
                            day: parseInt(
                              newSpecialHour.startDate.split("-")[2],
                            ),
                          },
                          closed: newSpecialHour.closed,
                        };
                        if (
                          newSpecialHour.endDate &&
                          newSpecialHour.endDate !== newSpecialHour.startDate
                        ) {
                          period.endDate = {
                            year: parseInt(
                              newSpecialHour.endDate.split("-")[0],
                            ),
                            month: parseInt(
                              newSpecialHour.endDate.split("-")[1],
                            ),
                            day: parseInt(newSpecialHour.endDate.split("-")[2]),
                          };
                        }
                        if (!newSpecialHour.closed) {
                          period.openTime = {
                            hours: newSpecialHour.openTime.hours,
                            minutes: newSpecialHour.openTime.minutes,
                          };
                          period.closeTime = {
                            hours: newSpecialHour.closeTime.hours,
                            minutes: newSpecialHour.closeTime.minutes,
                          };
                        }
                        setSpecialHours([...specialHours, period]);
                        setNewSpecialHour({
                          startDate: "",
                          endDate: "",
                          closed: false,
                          openTime: { hours: 9, minutes: 0 },
                          closeTime: { hours: 17, minutes: 0 },
                        });
                      }
                    }}
                    disabled={!newSpecialHour.startDate}
                    className="w-full border-primary/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Special Hour
                  </Button>
                </div>
              </div>

              {/* More Hours */}
              <div className="space-y-2 mt-6">
                <Label className="text-foreground">
                  More Hours (Additional Hours Types)
                </Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Additional hours for different departments or customer types
                  (e.g., delivery hours, drive-through hours)
                </p>

                {moreHours.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {moreHours.map((moreHour: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-secondary border border-primary/20 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm text-foreground font-medium">
                            {moreHour.hoursTypeId || `Hours Type ${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {moreHour.periods?.length || 0} periods
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setMoreHours(moreHours.filter((_, i) => i !== idx))
                          }
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-lg bg-secondary border border-primary/20 space-y-3">
                  <Label className="text-foreground">Add More Hours Type</Label>
                  <Input
                    placeholder="Hours Type ID"
                    value={newMoreHours.hoursTypeId}
                    onChange={(e) =>
                      setNewMoreHours({
                        ...newMoreHours,
                        hoursTypeId: e.target.value,
                      })
                    }
                    className="bg-card border-primary/30 text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Note: Hours Type ID should match available types for your
                    business category.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newMoreHours.hoursTypeId) {
                        setMoreHours([
                          ...moreHours,
                          {
                            hoursTypeId: newMoreHours.hoursTypeId,
                            periods: [],
                          },
                        ]);
                        setNewMoreHours({ hoursTypeId: "", periods: [] });
                      }
                    }}
                    disabled={!newMoreHours.hoursTypeId}
                    className="w-full border-primary/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Hours
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-foreground">Service Items</Label>
              <p className="text-xs text-muted-foreground mb-4">
                Services offered by your business
              </p>

              {/* Existing service items */}
              {serviceItems.length > 0 && (
                <div className="space-y-2 mb-4">
                  {serviceItems.map((item: any, idx: number) => {
                    const displayName =
                      item.structuredServiceItem?.description ||
                      item.freeFormServiceItem?.label?.displayName ||
                      "Service";
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-secondary border border-primary/20 flex items-center justify-between"
                      >
                        <span className="text-sm text-foreground">
                          {displayName}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setServiceItems(
                              serviceItems.filter((_, i) => i !== idx),
                            )
                          }
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add new service item */}
              <div className="p-4 rounded-lg bg-secondary border border-primary/20 space-y-3">
                <Label className="text-foreground">Add Service</Label>

                <Select
                  value={newServiceItem.type}
                  onValueChange={(value: "freeForm" | "structured") =>
                    setNewServiceItem({ ...newServiceItem, type: value })
                  }
                >
                  <SelectTrigger className="bg-card border-primary/30 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freeForm">Free Form</SelectItem>
                    <SelectItem value="structured">Structured</SelectItem>
                  </SelectContent>
                </Select>

                {newServiceItem.type === "freeForm" ? (
                  <>
                    <Input
                      placeholder="Service Name"
                      value={newServiceItem.displayName}
                      onChange={(e) =>
                        setNewServiceItem({
                          ...newServiceItem,
                          displayName: e.target.value,
                        })
                      }
                      className="bg-card border-primary/30 text-foreground"
                    />
                    <Input
                      placeholder="Category"
                      value={newServiceItem.category}
                      onChange={(e) =>
                        setNewServiceItem({
                          ...newServiceItem,
                          category: e.target.value,
                        })
                      }
                      className="bg-card border-primary/30 text-foreground"
                    />
                  </>
                ) : (
                  <Input
                    placeholder="Service Type ID"
                    value={newServiceItem.serviceTypeId}
                    onChange={(e) =>
                      setNewServiceItem({
                        ...newServiceItem,
                        serviceTypeId: e.target.value,
                      })
                    }
                    className="bg-card border-primary/30 text-foreground"
                  />
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      newServiceItem.type === "freeForm" &&
                      newServiceItem.displayName &&
                      newServiceItem.category
                    ) {
                      setServiceItems([
                        ...serviceItems,
                        {
                          freeFormServiceItem: {
                            category: newServiceItem.category,
                            label: {
                              displayName: newServiceItem.displayName,
                            },
                          },
                        },
                      ]);
                      setNewServiceItem({
                        type: "freeForm",
                        category: "",
                        displayName: "",
                        description: "",
                        serviceTypeId: "",
                      });
                    } else if (
                      newServiceItem.type === "structured" &&
                      newServiceItem.serviceTypeId
                    ) {
                      setServiceItems([
                        ...serviceItems,
                        {
                          structuredServiceItem: {
                            serviceTypeId: newServiceItem.serviceTypeId,
                            description: newServiceItem.description,
                          },
                        },
                      ]);
                      setNewServiceItem({
                        type: "freeForm",
                        category: "",
                        displayName: "",
                        description: "",
                        serviceTypeId: "",
                      });
                    }
                  }}
                  className="w-full border-primary/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-primary/20">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-primary/30"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.title}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Update Location
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
