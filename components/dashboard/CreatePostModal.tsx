'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createPost } from '@/server/actions/gmb-posts';
import { useRouter } from 'next/navigation';

type PostType = 'whats_new' | 'event' | 'offer' | 'product';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  onSuccess?: () => void;
}

const CTA_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'BOOK', label: 'Book' },
  { value: 'ORDER', label: 'Order' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CALL', label: 'Call' },
];

export function CreatePostModal({ isOpen, onClose, locationId, onSuccess }: CreatePostModalProps) {
  const [postType, setPostType] = useState<PostType>('whats_new');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState<string>('');
  const [url, setUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();

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
      const result = await createPost({
        locationId,
        postType,
        title: title || undefined,
        description: description.trim(),
        ctaType: cta ? (cta as any) : undefined,
        ctaUrl: url || undefined,
      });

      if (result.success) {
        toast.success('Post published successfully!', {
          description: 'Your post is now live on Google',
        });
        onSuccess?.();
        router.refresh();
        handleClose();
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
    setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setPostType('whats_new');
    setTitle('');
    setDescription('');
    setCta('');
    setUrl('');
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
            <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-400">
              File upload coming soon. Drop images here or click to browse.
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
            <Button onClick={handlePublish} disabled={isPublishing} className="bg-orange-600 hover:bg-orange-700 text-white">
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


