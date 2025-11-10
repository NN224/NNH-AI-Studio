'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { updatePost } from '@/server/actions/posts-management';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import type { GMBPost } from '@/lib/types/database';
import { validatePostForm, CTA_OPTIONS, type PostFormData } from './post-form-validation';

interface EditPostDialogProps {
  post: GMBPost;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditPostDialog({ post, isOpen, onClose, onSuccess }: EditPostDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [cta, setCta] = useState<string>('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setDescription(post.content || '');
      setMediaUrl(post.media_url || '');
      setCta(post.call_to_action || '');
      setCtaUrl(post.call_to_action_url || '');
      setScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '');
      setUploadedFile(null);
    }
  }, [post]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload a JPG, PNG, GIF, or WebP image',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('locationId', post.location_id);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      if (data.url) {
        setMediaUrl(data.url);
        setUploadedFile(file);
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUploading(false);
    }
  }, [post.location_id]);

  const handleRemoveMedia = useCallback(() => {
    setMediaUrl('');
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpdate = useCallback(async () => {
    // Validation using shared utility
    const formData: PostFormData = {
      title,
      description,
      mediaUrl,
      cta,
      ctaUrl,
      scheduledAt,
    };

    const validation = validatePostForm(formData, false);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updatePost({
        postId: post.id,
        title: title || undefined,
        description: description.trim(),
        mediaUrl: mediaUrl || undefined,
        ctaType: cta ? (cta as any) : undefined,
        ctaUrl: ctaUrl || undefined,
        scheduledAt: scheduledAt || null,
      });

      if (result.success) {
        toast.success(result.message || 'Post updated successfully!');
        handleClose();
        onSuccess?.();
      } else {
        toast.error('Failed to update post', {
          description: result.error || 'Please try again',
        });
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [post.id, title, description, mediaUrl, cta, ctaUrl, scheduledAt, onSuccess]);

  const handleClose = useCallback(() => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  }, [onClose]);

  const canEdit = post.status === 'draft' || post.status === 'queued';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Edit Post</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {post.status === 'published' && (
              <span className="text-yellow-400">
                Note: Editing a published post will update it on Google as well.
              </span>
            )}
            {!canEdit && (
              <span className="text-red-400">
                This post cannot be edited in its current state.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              maxLength={200}
              disabled={!canEdit}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc" className="text-zinc-300">Description *</Label>
              <span className={`text-xs ${description.length > 1500 ? 'text-red-400' : 'text-zinc-500'}`}>
                {description.length} / 1500
              </span>
            </div>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a compelling description..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[120px]"
              maxLength={1600}
              disabled={!canEdit}
            />
            {description.length > 1500 && (
              <p className="text-xs text-red-400">Description exceeds the 1500 character limit</p>
            )}
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Media (optional)</Label>
            
            {!mediaUrl ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload-edit"
                  disabled={!canEdit || uploading}
                />
                <label htmlFor="media-upload-edit">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    disabled={!canEdit || uploading}
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                </label>
                <p className="text-xs text-zinc-500">
                  Or enter a URL below (max 10MB, JPG/PNG/GIF/WebP)
                </p>
                <Input
                  id="media-url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  disabled={!canEdit}
                />
              </div>
            ) : (
              <div className="relative border border-zinc-700 rounded-lg p-4 bg-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <ImageIcon className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">
                      {uploadedFile?.name || 'Media URL'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{mediaUrl}</p>
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveMedia}
                      className="flex-shrink-0 text-zinc-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {mediaUrl && (() => {
                  // Sanitize URL to prevent XSS
                  try {
                    const url = new URL(mediaUrl);
                    // Only allow http/https protocols
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                      return (
                        <img
                          src={url.href}
                          alt="Preview"
                          className="mt-2 max-h-40 rounded-md object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      );
                    }
                  } catch {
                    // Invalid URL, don't render
                    return null;
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">CTA Button</Label>
              <Select value={cta} onValueChange={setCta} disabled={!canEdit}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select CTA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CTA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url" className="text-zinc-300">CTA URL</Label>
              <Input
                id="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                disabled={!cta || cta === 'CALL' || !canEdit}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="schedule" className="text-zinc-300">Schedule (optional)</Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              disabled={!canEdit}
              min={new Date().toISOString().slice(0, 16)}
            />
            {scheduledAt && (
              <p className="text-xs text-zinc-500">
                Post will be saved as scheduled and published at the specified time
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || !canEdit || !description.trim()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Post'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

