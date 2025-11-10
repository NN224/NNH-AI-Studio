'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface BrandingTabProps {
  onSave?: () => void;
}

export function BrandingTab({ onSave }: BrandingTabProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#FFA500');
  const [secondaryColor, setSecondaryColor] = useState('#1A1A1A');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing branding data
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data, error } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching branding:', error);
          }
        } else if (data) {
          setBrandName(data.brand_name || '');
          setLogoUrl(data.logo_url || null);
          setCoverImageUrl(data.cover_image_url || null);
          setPrimaryColor(data.primary_color || '#FFA500');
          setSecondaryColor(data.secondary_color || '#1A1A1A');
        }
      } catch (error) {
        console.error('Error in fetchBranding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [supabase]);

  // Upload file to Supabase Storage
  const uploadFile = async (file: File, type: 'logo' | 'cover') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get file extension
      const extension = file.name.split('.').pop();
      const fileName = type === 'logo' ? `logo.${extension}` : `cover.${extension}`;
      const filePath = `${user.id}/${fileName}`;

      // Delete existing file if it exists (ignore errors if file doesn't exist)
      await supabase.storage
        .from('branding_assets')
        .remove([filePath]);
      
      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('branding_assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding_assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const publicUrl = await uploadFile(file, 'logo');
      setLogoUrl(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      const err = error as Error;
      toast.error('Failed to upload logo', {
        description: err.message,
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingCover(true);
      const publicUrl = await uploadFile(file, 'cover');
      setCoverImageUrl(publicUrl);
      toast.success('Cover image uploaded successfully');
    } catch (error) {
      const err = error as Error;
      toast.error('Failed to upload cover image', {
        description: err.message,
      });
    } finally {
      setUploadingCover(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const profileData = {
        user_id: user.id,
        brand_name: brandName || null,
        logo_url: logoUrl,
        cover_image_url: coverImageUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      };

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('client_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('client_profiles')
          .insert([profileData]);

        if (error) throw error;
      }

      toast.success('Branding saved successfully!', {
        description: 'Your changes have been applied.',
      });

      // Trigger refresh in parent if callback provided
      if (onSave) {
        onSave();
      }

      // Trigger page refresh to apply branding
      window.dispatchEvent(new Event('brand-profile-updated'));
    } catch (error) {
      console.error('Error saving branding:', error);
      const err = error as Error;
      toast.error('Failed to save branding', {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>
            Customize your platform with your brand's identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              placeholder="Enter your brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex flex-col gap-4">
              {logoUrl && (
                <div className="relative w-32 h-32 rounded-lg border border-border overflow-hidden bg-muted">
                  <Image
                    src={logoUrl}
                    alt="Brand Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommended: Square image, max 2MB (PNG, JPG, SVG)
                </p>
              </div>
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div className="flex flex-col gap-4">
              {coverImageUrl && (
                <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden bg-muted">
                  <Image
                    src={coverImageUrl}
                    alt="Cover Image"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Cover
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommended: 16:9 aspect ratio, max 5MB (PNG, JPG)
                </p>
              </div>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 rounded border border-border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#FFA500"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-20 rounded border border-border cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#1A1A1A"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
