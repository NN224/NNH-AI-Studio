"use client"

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, Camera, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface LocationMediaUploadProps {
  locationId: string
  currentLogo?: string | null
  currentCover?: string | null
  onUploadSuccess?: () => void
}

export function LocationMediaUpload({ 
  locationId, 
  currentLogo, 
  currentCover,
  onUploadSuccess 
}: LocationMediaUploadProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover
    setUploading(true)

    try {
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Not authenticated')
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${locationId}/${type}_${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('location-media')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('location-media')
        .getPublicUrl(fileName)

      // Update location with new URL
      const updateData = type === 'logo' 
        ? { logo_url: publicUrl }
        : { cover_photo_url: publicUrl }

      const { error: updateError } = await supabase
        .from('gmb_locations')
        .update(updateData)
        .eq('id', locationId)

      if (updateError) {
        throw updateError
      }

      toast.success(`${type === 'logo' ? 'Logo' : 'Cover photo'} uploaded successfully`)
      onUploadSuccess?.()

    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Business Media</CardTitle>
        <CardDescription>
          Upload your business logo and cover photo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Logo</h4>
              <p className="text-sm text-muted-foreground">
                Your business logo (square format recommended)
              </p>
            </div>
            <div className="flex items-center gap-4">
              {currentLogo && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border">
                  <img 
                    src={currentLogo} 
                    alt="Current logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'logo')
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {currentLogo ? 'Change Logo' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </div>

        {/* Cover Photo Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Cover Photo</h4>
              <p className="text-sm text-muted-foreground">
                Wide banner image (16:9 format recommended)
              </p>
            </div>
            <div className="flex items-center gap-4">
              {currentCover && (
                <div className="w-24 h-14 rounded-lg overflow-hidden border">
                  <img 
                    src={currentCover} 
                    alt="Current cover" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'cover')
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4 mr-2" />
                )}
                {currentCover ? 'Change Cover' : 'Upload Cover'}
              </Button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Uploaded images are stored locally and can be synced with Google My Business later.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
