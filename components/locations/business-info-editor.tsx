"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Phone,
  Globe,
  Edit2,
  Save,
  X,
  Loader2,
  Building2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessInfo } from "@/hooks/use-business-info";

interface BusinessInfoEditorProps {
  locationId: string;
  location: any;
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
    name: location?.title || location?.name || "",
    description: location?.description || "",
    category: location?.primary_category || location?.category || "",
  });

  const [contactInfo, setContactInfo] = useState({
    phone:
      location?.phoneNumbers?.primaryPhoneNumber?.phoneNumber ||
      location?.phone ||
      "",
    website: location?.websiteUri || location?.website || "",
    email: location?.email || "",
  });

  const address = location?.storefrontAddress || location?.address || {};
  const [addressInfo, setAddressInfo] = useState({
    street: Array.isArray(address?.addressLines)
      ? address.addressLines.join(", ")
      : address?.street || "",
    city: address?.locality || address?.city || "",
    state: address?.administrativeArea || address?.state || "",
    zip: address?.postalCode || address?.zip || "",
    country: address?.regionCode || address?.country || "US",
  });

  const [socialLinks, setSocialLinks] = useState({
    facebook: location?.social?.facebook || location?.facebook_url || "",
    instagram: location?.social?.instagram || location?.instagram_url || "",
    twitter: location?.social?.twitter || location?.twitter_url || "",
    linkedin: location?.social?.linkedin || location?.linkedin_url || "",
  });

  const [attributes, setAttributes] = useState<string[]>(
    location?.attributes ||
      location?.serviceItems?.map((s: any) => s.displayName || s) ||
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
        name: location?.title || location?.name || "",
        description: location?.description || "",
        category: location?.primary_category || location?.category || "",
      });
    } else if (section === "contact") {
      setContactInfo({
        phone:
          location?.phoneNumbers?.primaryPhoneNumber?.phoneNumber ||
          location?.phone ||
          "",
        website: location?.websiteUri || location?.website || "",
        email: location?.email || "",
      });
    } else if (section === "address") {
      const addr = location?.storefrontAddress || location?.address || {};
      setAddressInfo({
        street: Array.isArray(addr?.addressLines)
          ? addr.addressLines.join(", ")
          : addr?.street || "",
        city: addr?.locality || addr?.city || "",
        state: addr?.administrativeArea || addr?.state || "",
        zip: addr?.postalCode || addr?.zip || "",
        country: addr?.regionCode || addr?.country || "US",
      });
    }
  };

  const handleSave = async (section: keyof EditState) => {
    try {
      let updateData: any = {};

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

  const isSaving =
    updateBusinessInfo.isPending && Object.values(editing).some((v) => v);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Basic Information */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Building2 className="w-5 h-5" />
              Basic Information
            </CardTitle>
            {!editing.basic ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit("basic")}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel("basic")}
                  disabled={isSaving}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave("basic")}
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
        <CardContent className="space-y-4">
          {editing.basic ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Business Name *
                </Label>
                <Input
                  id="name"
                  value={basicInfo.name}
                  onChange={(e) =>
                    setBasicInfo({ ...basicInfo, name: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={basicInfo.description}
                  onChange={(e) =>
                    setBasicInfo({ ...basicInfo, description: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  rows={3}
                  disabled={isSaving}
                  maxLength={750}
                />
                <p className="text-xs text-zinc-500">
                  {basicInfo.description.length}/750 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-zinc-300">
                  Category
                </Label>
                <Input
                  id="category"
                  value={basicInfo.category}
                  onChange={(e) =>
                    setBasicInfo({ ...basicInfo, category: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Name</p>
                <p className="text-sm text-zinc-400">
                  {basicInfo.name || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">
                  Description
                </p>
                <p className="text-sm text-zinc-400">
                  {basicInfo.description || "No description"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">
                  Category
                </p>
                <p className="text-sm text-zinc-400">
                  {basicInfo.category || "Not set"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Phone className="w-5 h-5" />
              Contact Details
            </CardTitle>
            {!editing.contact ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit("contact")}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel("contact")}
                  disabled={isSaving}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave("contact")}
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
        <CardContent className="space-y-4">
          {editing.contact ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-300">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) =>
                    setContactInfo({ ...contactInfo, phone: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-zinc-300">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={contactInfo.website}
                  onChange={(e) =>
                    setContactInfo({ ...contactInfo, website: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) =>
                    setContactInfo({ ...contactInfo, email: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                  placeholder="contact@business.com"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">Phone</p>
                  <p className="text-sm text-zinc-400">
                    {contactInfo.phone || "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">Website</p>
                  <a
                    href={contactInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {contactInfo.website || "Not set"}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">Email</p>
                  <p className="text-sm text-zinc-400">
                    {contactInfo.email || "Not set"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <MapPin className="w-5 h-5" />
              Address
            </CardTitle>
            {!editing.address ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit("address")}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel("address")}
                  disabled={isSaving}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave("address")}
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
          {editing.address ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street" className="text-zinc-300">
                  Street Address
                </Label>
                <Input
                  id="street"
                  value={addressInfo.street}
                  onChange={(e) =>
                    setAddressInfo({ ...addressInfo, street: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-zinc-300">
                  City
                </Label>
                <Input
                  id="city"
                  value={addressInfo.city}
                  onChange={(e) =>
                    setAddressInfo({ ...addressInfo, city: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-zinc-300">
                  State/Province
                </Label>
                <Input
                  id="state"
                  value={addressInfo.state}
                  onChange={(e) =>
                    setAddressInfo({ ...addressInfo, state: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip" className="text-zinc-300">
                  ZIP/Postal Code
                </Label>
                <Input
                  id="zip"
                  value={addressInfo.zip}
                  onChange={(e) =>
                    setAddressInfo({ ...addressInfo, zip: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-zinc-300">
                  Country
                </Label>
                <Input
                  id="country"
                  value={addressInfo.country}
                  onChange={(e) =>
                    setAddressInfo({ ...addressInfo, country: e.target.value })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={isSaving}
                />
              </div>
            </div>
          ) : (
            <div className="text-zinc-400">
              <p className="text-sm">
                {addressInfo.street || "Street not set"}
              </p>
              <p className="text-sm">
                {[addressInfo.city, addressInfo.state, addressInfo.zip]
                  .filter(Boolean)
                  .join(", ") || "City, State, ZIP not set"}
              </p>
              <p className="text-sm">{addressInfo.country}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <span>📘</span>
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
                  <span>📷</span>
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
                  <span>𝕏</span>
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
                  <span>💼</span>
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
                  <span>📘</span>
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
                  <span>📷</span>
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
                  <span>𝕏</span>
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
                  <span>💼</span>
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
              <span>🏷️</span>
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
                      if (newAttribute.trim()) {
                        setAttributes([...attributes, newAttribute.trim()]);
                        setNewAttribute("");
                      }
                    }
                  }}
                  disabled={isSaving}
                />
                <Button
                  onClick={() => {
                    if (newAttribute.trim()) {
                      setAttributes([...attributes, newAttribute.trim()]);
                      setNewAttribute("");
                    }
                  }}
                  size="sm"
                  disabled={!newAttribute.trim() || isSaving}
                  className="shrink-0"
                >
                  +Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attributes.map((attr, index) => (
                  <div
                    key={index}
                    className="bg-zinc-800 text-zinc-100 px-3 py-1 rounded-md flex items-center gap-2"
                  >
                    {attr}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-zinc-700"
                      onClick={() =>
                        setAttributes(attributes.filter((_, i) => i !== index))
                      }
                      disabled={isSaving}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
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
                <div
                  key={index}
                  className="border border-zinc-700 text-zinc-300 px-3 py-1 rounded-md text-sm"
                >
                  {attr}
                </div>
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
