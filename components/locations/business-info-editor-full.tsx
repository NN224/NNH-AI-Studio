"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Edit2,
  Save,
  X,
  Loader2,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Tags,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessInfo } from "@/hooks/use-business-info";

interface BusinessInfoEditorProps {
  locationId: string;
  location: Record<string, unknown>;
  onUpdate?: () => void;
}

interface EditState {
  basic: boolean;
  contact: boolean;
  address: boolean;
  social: boolean;
  attributes: boolean;
}

export function BusinessInfoEditor({
  locationId,
  location,
  onUpdate,
}: BusinessInfoEditorProps) {
  const { updateBusinessInfo } = useBusinessInfo(locationId);
  const [editing, setEditing] = useState<EditState>({
    basic: false,
    contact: false,
    address: false,
    social: false,
    attributes: false,
  });

  // Form states
  const [basicInfo, setBasicInfo] = useState({
    name: (location?.title as string) || (location?.name as string) || "",
    description: (location?.description as string) || "",
    category:
      (location?.primary_category as string) ||
      (location?.category as string) ||
      "",
  });

  const [contactInfo, setContactInfo] = useState({
    phone:
      ((
        (
          (location as Record<string, unknown>)?.phoneNumbers as Record<
            string,
            unknown
          >
        )?.primaryPhoneNumber as Record<string, unknown>
      )?.phoneNumber as string) ||
      (location?.phone as string) ||
      "",
    website:
      (location?.websiteUri as string) || (location?.website as string) || "",
    email: (location?.email as string) || "",
  });

  const address =
    (location?.storefrontAddress as Record<string, unknown>) ||
    (location?.address as Record<string, unknown>) ||
    {};
  const [addressInfo, setAddressInfo] = useState({
    street: Array.isArray(address?.addressLines)
      ? (address.addressLines as string[]).join(", ")
      : (address?.street as string) || "",
    city: (address?.locality as string) || (address?.city as string) || "",
    state:
      (address?.administrativeArea as string) ||
      (address?.state as string) ||
      "",
    zip: (address?.postalCode as string) || (address?.zip as string) || "",
    country:
      (address?.regionCode as string) || (address?.country as string) || "US",
  });

  const [socialLinks, setSocialLinks] = useState({
    facebook:
      ((location?.social as Record<string, unknown>)?.facebook as string) ||
      (location?.facebook_url as string) ||
      "",
    instagram:
      ((location?.social as Record<string, unknown>)?.instagram as string) ||
      (location?.instagram_url as string) ||
      "",
    twitter:
      ((location?.social as Record<string, unknown>)?.twitter as string) ||
      (location?.twitter_url as string) ||
      "",
    linkedin:
      ((location?.social as Record<string, unknown>)?.linkedin as string) ||
      (location?.linkedin_url as string) ||
      "",
  });

  const [attributes, setAttributes] = useState<string[]>(
    (location?.attributes as string[]) ||
      (location?.serviceItems as Array<{ displayName?: string }>)?.map(
        (s) => s.displayName || String(s),
      ) ||
      [],
  );
  const [newAttribute, setNewAttribute] = useState("");

  const handleEdit = (section: keyof EditState) => {
    setEditing({ ...editing, [section]: true });
  };

  const handleCancel = (section: keyof EditState) => {
    setEditing({ ...editing, [section]: false });
    // Reset form values
    if (section === "basic") {
      setBasicInfo({
        name: (location?.title as string) || (location?.name as string) || "",
        description: (location?.description as string) || "",
        category:
          (location?.primary_category as string) ||
          (location?.category as string) ||
          "",
      });
    } else if (section === "contact") {
      setContactInfo({
        phone:
          ((
            (
              (location as Record<string, unknown>)?.phoneNumbers as Record<
                string,
                unknown
              >
            )?.primaryPhoneNumber as Record<string, unknown>
          )?.phoneNumber as string) ||
          (location?.phone as string) ||
          "",
        website:
          (location?.websiteUri as string) ||
          (location?.website as string) ||
          "",
        email: (location?.email as string) || "",
      });
    } else if (section === "address") {
      const addr =
        (location?.storefrontAddress as Record<string, unknown>) ||
        (location?.address as Record<string, unknown>) ||
        {};
      setAddressInfo({
        street: Array.isArray(addr?.addressLines)
          ? (addr.addressLines as string[]).join(", ")
          : (addr?.street as string) || "",
        city: (addr?.locality as string) || (addr?.city as string) || "",
        state:
          (addr?.administrativeArea as string) || (addr?.state as string) || "",
        zip: (addr?.postalCode as string) || (addr?.zip as string) || "",
        country:
          (addr?.regionCode as string) || (addr?.country as string) || "US",
      });
    } else if (section === "social") {
      setSocialLinks({
        facebook:
          ((location?.social as Record<string, unknown>)?.facebook as string) ||
          (location?.facebook_url as string) ||
          "",
        instagram:
          ((location?.social as Record<string, unknown>)
            ?.instagram as string) ||
          (location?.instagram_url as string) ||
          "",
        twitter:
          ((location?.social as Record<string, unknown>)?.twitter as string) ||
          (location?.twitter_url as string) ||
          "",
        linkedin:
          ((location?.social as Record<string, unknown>)?.linkedin as string) ||
          (location?.linkedin_url as string) ||
          "",
      });
    } else if (section === "attributes") {
      setAttributes(
        (location?.attributes as string[]) ||
          (location?.serviceItems as Array<{ displayName?: string }>)?.map(
            (s) => s.displayName || String(s),
          ) ||
          [],
      );
    }
  };

  const handleSave = async (section: keyof EditState) => {
    try {
      let updateData: Record<string, unknown> = {};

      if (section === "basic") {
        if (!basicInfo.name || basicInfo.name.trim().length < 3) {
          toast.error("Business name must be at least 3 characters");
          return;
        }
        updateData = {
          name: basicInfo.name,
          description: basicInfo.description,
          category: basicInfo.category,
        };
      } else if (section === "contact") {
        if (contactInfo.phone && !/^\+?[\d\s\-()]+$/.test(contactInfo.phone)) {
          toast.error("Invalid phone number format");
          return;
        }
        if (
          contactInfo.website &&
          !/^https?:\/\/.+/.test(contactInfo.website)
        ) {
          toast.error("Website must start with http:// or https://");
          return;
        }
        updateData = {
          phone: contactInfo.phone,
          website: contactInfo.website,
          email: contactInfo.email,
        };
      } else if (section === "address") {
        updateData = {
          address: addressInfo,
        };
      } else if (section === "social") {
        updateData = {
          social: socialLinks,
        };
      } else if (section === "attributes") {
        updateData = {
          attributes,
        };
      }

      await updateBusinessInfo.mutateAsync(updateData);
      setEditing({ ...editing, [section]: false });
      toast.success("Business information updated successfully!");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleAddAttribute = () => {
    if (newAttribute.trim()) {
      setAttributes([...attributes, newAttribute.trim()]);
      setNewAttribute("");
    }
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const isSaving =
    updateBusinessInfo.isPending && Object.values(editing).some((v) => v);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Basic Information - keeping existing code */}
      {/* Contact Details - keeping existing code */}
      {/* Address - keeping existing code */}

      {/* Social Media Links */}
      <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Globe className="w-5 h-5" />
              Social Media Links
            </CardTitle>
            {!editing.social ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit("social")}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel("social")}
                  disabled={isSaving}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave("social")}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing.social ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="facebook"
                  className="text-zinc-300 flex items-center gap-2"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={socialLinks.facebook}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, facebook: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="instagram"
                  className="text-zinc-300 flex items-center gap-2"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={socialLinks.instagram}
                  onChange={(e) =>
                    setSocialLinks({
                      ...socialLinks,
                      instagram: e.target.value,
                    })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="https://instagram.com/yourpage"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="twitter"
                  className="text-zinc-300 flex items-center gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter / X
                </Label>
                <Input
                  id="twitter"
                  value={socialLinks.twitter}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, twitter: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="https://twitter.com/yourpage"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="linkedin"
                  className="text-zinc-300 flex items-center gap-2"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={socialLinks.linkedin}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, linkedin: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-primary"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-primary"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-primary"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-primary"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              )}
              {!socialLinks.facebook &&
                !socialLinks.instagram &&
                !socialLinks.twitter &&
                !socialLinks.linkedin && (
                  <p className="text-sm text-zinc-500 col-span-2">
                    No social media links added
                  </p>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Attributes */}
      <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Tags className="w-5 h-5" />
              Attributes & Amenities
            </CardTitle>
            {!editing.attributes ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit("attributes")}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel("attributes")}
                  disabled={isSaving}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave("attributes")}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing.attributes ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newAttribute}
                  onChange={(e) => setNewAttribute(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  placeholder="Add attribute (e.g., WiFi, Parking, Wheelchair accessible)"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAttribute();
                    }
                  }}
                  disabled={isSaving}
                />
                <Button
                  onClick={handleAddAttribute}
                  size="sm"
                  disabled={!newAttribute.trim() || isSaving}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attributes.map((attr, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-zinc-800 text-zinc-100 pr-1"
                  >
                    {attr}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-1 hover:bg-zinc-700"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={isSaving}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
                {attributes.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No attributes added yet
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  {attr}
                </Badge>
              ))}
              {attributes.length === 0 && (
                <p className="text-sm text-zinc-500">No attributes added</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
