"use client";

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createPost } from '@/server/actions/posts-management';
import { useRouter } from 'next/navigation';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

type PostType = 'whats_new' | 'event' | 'offer' | 'product';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  onSuccess?: (result?: any) => void;
}

const CTA_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'BOOK', label: 'Book' },
  { value: 'ORDER', label: 'Order' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CALL', label: 'Call' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export function CreatePostModal({ isOpen, onClose, locationId, onSuccess }: CreatePostModalProps) {
  const [postType, setPostType] = useState<PostType>('whats_new');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState<string>('');
  const [url, setUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF).');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is too large. Maximum size is 5MB.');
      return;
    }

    setMediaFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await res.json();
      if (data.url) {
        return data.url;
      }
      throw new Error('No URL returned from upload');
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error(error.message || 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async () => {
    // Validation
    if (description.trim().length === 0) {
      toast.error('Please enter a description for your post');
      return;
    }

    if (description.length > 1500) {
      toast.error('Description is too long. Maximum 1500 characters.');
      return;
    }

    if (cta && !url) {
      toast.error('Please provide a URL for your call-to-action');
      return;
    }

    setIsPublishing(true);

    try {
      // Upload image if selected
      let uploadedMediaUrl = mediaUrl;
      if (mediaFile && !mediaUrl) {
        const uploadedUrl = await uploadImage(mediaFile);
        if (!uploadedUrl) {
          setIsPublishing(false);
          return; // Error already shown in uploadImage
        }
        uploadedMediaUrl = uploadedUrl;
      }

      const result = await createPost({
        locationId,
        postType,
        title: title || undefined,
        description: description.trim(),
        ctaType: cta ? (cta as any) : undefined,
        ctaUrl: url || undefined,
        mediaUrl: uploadedMediaUrl || undefined,
      });

      if (result.success) {
        toast.success('Post published successfully!', {
          description: 'Your post is now live on Google',
        });
        // Let parent handle navigation and modal close
        onSuccess?.(result);
      } else {
        toast.error('Failed to publish post', {
          description: result.error || 'Please try again',
          action: result.error?.includes('reconnect')
            ? {
                label: 'Settings',
                onClick: () => router.push('/settings'),
              }
            : undefined,
        });
      }
    } catch (error: any) {
      console.error('Error publishing post:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
      if (isMounted.current) setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setPostType('whats_new');
    setTitle('');
    setDescription('');
    setCta('');
    setUrl('');
    removeMedia();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create New Post</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Draft and publish a Google Business Profile post.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-300">Post Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'whats_new', label: "What's New" },
                { key: 'event', label: 'Event' },
                { key: 'offer', label: 'Offer' },
                { key: 'product', label: 'Product' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPostType(opt.key as PostType)}
                  className={`px-3 py-2 rounded-md border text-sm transition-all ${
                    postType === (opt.key as PostType)
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

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
            />
            {description.length > 1500 && (
              <p className="text-xs text-red-400">Description exceeds the 1500 character limit</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Media</Label>
            <div
              className="rounded-md border border-dashed border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-400 relative"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {mediaPreview ? (
                <div className="relative">
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-md mb-2"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeMedia}
                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ImageIcon className="w-12 h-12 text-zinc-500 mb-2" />
                  <p className="text-zinc-400 mb-2">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-xs text-zinc-500 mb-4">
                    JPEG, PNG, WebP, or GIF (max 5MB)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">CTA Button</Label>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-600"
              >
                {CTA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url" className="text-zinc-300">CTA URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={handleClose} className="text-zinc-300 hover:text-zinc-100">
              Cancel
            </Button>
            <Button 
              onClick={handlePublish} 
              disabled={isPublishing || isUploading} 
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isPublishing ? 'Publishing...' : isUploading ? 'Uploading...' : 'Publish'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


