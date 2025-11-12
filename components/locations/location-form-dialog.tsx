"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Location } from '@/components/locations/location-types';

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  locationId?: string | null;
  initialData?: Partial<Location> | null;
}

const defaultFormState = {
  name: '',
  address: '',
  phone: '',
  website: '',
  category: '',
};

export function LocationFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  locationId,
  initialData,
}: LocationFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultFormState);

  const derivedInitialData = useMemo(() => {
    if (!initialData) return null;

    const metadata = initialData.metadata ?? {};
    const primaryCategory = metadata.categories?.primaryCategory?.displayName ?? metadata.category ?? null;

    return {
      name: initialData.name ?? '',
      address: initialData.address ?? '',
      phone: initialData.phone ?? '',
      website: initialData.website ?? '',
      category: initialData.category ?? primaryCategory ?? '',
    };
  }, [initialData]);

  useEffect(() => {
    if (open && (locationId || derivedInitialData)) {
      setFormData({
        name: derivedInitialData?.name ?? initialData?.name ?? '',
        address: derivedInitialData?.address ?? initialData?.address ?? '',
        phone: derivedInitialData?.phone ?? initialData?.phone ?? '',
        website: derivedInitialData?.website ?? initialData?.website ?? '',
        category: derivedInitialData?.category ?? '',
      });
    } else if (open && !locationId) {
      setFormData(defaultFormState);
    }

    if (!open && !locationId) {
      setFormData(defaultFormState);
    }
  }, [open, locationId, derivedInitialData, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = locationId ? `/api/locations/${locationId}` : '/api/locations';
      const method = locationId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save location');
      }

      toast.success(locationId ? 'Location updated successfully' : 'Location added successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        address: '',
        phone: '',
        website: '',
        category: '',
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {locationId ? 'Edit Location' : 'Add New Location'}
          </DialogTitle>
          <DialogDescription>
            {locationId 
              ? 'Update the location information below'
              : 'Add a new business location to your account'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Location Name *</Label>
            <Input
              id="name"
              placeholder="Enter location name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                placeholder="Enter full address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="website"
                  placeholder="https://example.com"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Restaurant">Restaurant</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Service">Service</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                locationId ? 'Update Location' : 'Add Location'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
