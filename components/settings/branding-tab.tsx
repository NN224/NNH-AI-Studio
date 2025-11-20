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
  readonly onSave?: () => void;
  // Branding state from parent (optional - for unified save)
  brandName?: string;
  setBrandName?: (value: string) => void;
  primaryColor?: string;
  setPrimaryColor?: (value: string) => void;
  secondaryColor?: string;
  setSecondaryColor?: (value: string) => void;
  logoUrl?: string | null;
  setLogoUrl?: (value: string | null) => void;
  coverImageUrl?: string | null;
  setCoverImageUrl?: (value: string | null) => void;
}

export function BrandingTab({ 
  onSave,
  brandName: brandNameProp,
  setBrandName: setBrandNameProp,
  primaryColor: primaryColorProp,
  setPrimaryColor: setPrimaryColorProp,
  secondaryColor: secondaryColorProp,
  setSecondaryColor: setSecondaryColorProp,
  logoUrl: logoUrlProp,
  setLogoUrl: setLogoUrlProp,
  coverImageUrl: coverImageUrlProp,
  setCoverImageUrl: setCoverImageUrlProp
}: BrandingTabProps) {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Use props if provided, otherwise use local state
  const [localBrandName, setLocalBrandName] = useState('');
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const [localCoverImageUrl, setLocalCoverImageUrl] = useState<string | null>(null);
  const [localPrimaryColor, setLocalPrimaryColor] = useState('#FFA500');
  const [localSecondaryColor, setLocalSecondaryColor] = useState('#1A1A1A');
  
  const brandName = brandNameProp ?? localBrandName;
  const setBrandName = setBrandNameProp ?? setLocalBrandName;
  const logoUrl = logoUrlProp ?? localLogoUrl;
  const setLogoUrl = setLogoUrlProp ?? setLocalLogoUrl;
  const coverImageUrl = coverImageUrlProp ?? localCoverImageUrl;
  const setCoverImageUrl = setCoverImageUrlProp ?? setLocalCoverImageUrl;
  const primaryColor = primaryColorProp ?? localPrimaryColor;
  const setPrimaryColor = setPrimaryColorProp ?? setLocalPrimaryColor;
  const secondaryColor = secondaryColorProp ?? localSecondaryColor;
  const setSecondaryColor = setSecondaryColorProp ?? setLocalSecondaryColor;
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing branding data (only if not provided via props)
  useEffect(() => {
    if (brandNameProp !== undefined) {
      // Branding is managed by parent, skip loading
      setLoading(false);
      return;
    }

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
          setLocalBrandName(data.brand_name || '');
          setLocalLogoUrl(data.logo_url || null);
          setLocalCoverImageUrl(data.cover_image_url || null);
          setLocalPrimaryColor(data.primary_color || '#FFA500');
          setLocalSecondaryColor(data.secondary_color || '#1A1A1A');
        }
      } catch (error) {
        console.error('Error in fetchBranding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [supabase, brandNameProp]);

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
      toast.error(t('toast.invalidImageFile'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('toast.logoSizeError'));
      return;
    }

    try {
      setUploadingLogo(true);
      const publicUrl = await uploadFile(file, 'logo');
      setLogoUrl(publicUrl);
      toast.success(t('toast.logoUploaded'));
    } catch (error) {
      const err = error as Error;
      toast.error(t('toast.logoUploadFailed'), {
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
      toast.error(t('toast.invalidImageFile'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toast.coverSizeError'));
      return;
    }

    try {
      setUploadingCover(true);
      const publicUrl = await uploadFile(file, 'cover');
      setCoverImageUrl(publicUrl);
      toast.success(t('toast.coverUploaded'));
    } catch (error) {
      const err = error as Error;
      toast.error(t('toast.coverUploadFailed'), {
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

      toast.success(t('toast.saved'), {
        description: t('toast.savedDescription'),
      });

      // Trigger refresh in parent if callback provided
      if (onSave) {
        onSave();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('brand-profile-updated'));
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      const err = error as Error;
      toast.error(t('toast.saveFailed'), {
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
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brandName">{t('brandName')}</Label>
            <Input
              id="brandName"
              placeholder={t('brandNamePlaceholder')}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>{t('logo')}</Label>
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
                      {t('uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t('uploadLogo')}
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('logoHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>{t('coverImage')}</Label>
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
                      {t('uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t('uploadCover')}
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('coverHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t('primaryColor')}</Label>
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
              <p className="text-xs text-muted-foreground">
                {t('primaryColorHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">{t('secondaryColor')}</Label>
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
              <p className="text-xs text-muted-foreground">
                {t('secondaryColorHint')}
              </p>
            </div>
          </div>

          {/* Save Button - Only show if not managed by parent */}
          {!setBrandNameProp && (
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
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t('saveChanges')}
                  </>
                )}
              </Button>
            </div>
          )}
          
          {setBrandNameProp && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg mt-4">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t('saveHint')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
