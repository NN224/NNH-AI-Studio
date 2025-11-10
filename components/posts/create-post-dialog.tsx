'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createPost } from '@/server/actions/posts-management';
import { Loader2, Sparkles } from 'lucide-react';
import { validatePostForm, CTA_OPTIONS, POST_TYPES, type PostFormData } from './post-form-validation';

type PostType = 'whats_new' | 'event' | 'offer' | 'product';

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Array<{ id: string; location_name: string }>;
  onSuccess?: () => void;
}

export function CreatePostDialog({ isOpen, onClose, locations, onSuccess }: CreatePostDialogProps) {
  const [postType, setPostType] = useState<PostType>('whats_new');
  const [locationId, setLocationId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [cta, setCta] = useState<string>('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateAI = useCallback(async () => {
    if (!description.trim() && !title.trim()) {
      toast.error('Please enter some content to generate from');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'gmb',
          prompt: description || title,
          tone: 'friendly',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data = await response.json();
      if (data?.title) setTitle(data.title);
      if (data?.description) setDescription(data.description);

      toast.success('Content generated successfully!');
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate content', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setGenerating(false);
    }
  }, [description, title]);

  const handlePublish = useCallback(async () => {
    // Validation using shared utility
    const formData: PostFormData = {
      locationId,
      title,
      description,
      mediaUrl,
      cta,
      ctaUrl,
      scheduledAt,
    };

    const validation = validatePostForm(formData);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsPublishing(true);

    try {
      const result = await createPost({
        locationId,
        postType,
        title: title || undefined,
        description: description.trim(),
        mediaUrl: mediaUrl || undefined,
        ctaType: cta ? (cta as any) : undefined,
        ctaUrl: ctaUrl || undefined,
        scheduledAt: scheduledAt || undefined,
      });

      if (result.success) {
        toast.success(result.message || 'Post created successfully!');
        handleClose();
        onSuccess?.();
      } else {
        if (result.errorCode === 'AUTH_EXPIRED') {
          toast.error('Authentication expired', {
            description: result.error,
            action: {
              label: 'Reconnect Google',
              onClick: () => window.location.href = '/settings?tab=accounts',
            },
          });
        } else {
          toast.error('Failed to create post', {
            description: result.error || 'Please try again',
          });
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [locationId, postType, title, description, mediaUrl, cta, ctaUrl, scheduledAt, onSuccess]);

  const handleClose = useCallback(() => {
    setPostType('whats_new');
    setLocationId('');
    setTitle('');
    setDescription('');
    setMediaUrl('');
    setCta('');
    setCtaUrl('');
    setScheduledAt('');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create New Post</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Draft and publish a Google Business Profile post.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Location Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Location *</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((loc) => loc.id && loc.id.trim() !== '')
                  .map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.location_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Post Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {POST_TYPES.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPostType(opt.key as PostType)}
                  className={`px-3 py-2 rounded-md border text-sm transition-all ${
                    postType === (opt.key as PostType)
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10'
                  }`}
                  aria-pressed={postType === opt.key}
                  aria-label={`Select ${opt.label} post type`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(postType === 'event' || postType === 'offer') && (
              <p className="text-xs text-yellow-400">
                Note: Event and Offer posts can only be saved as drafts. Google Business Profile API currently only supports "What's New" posts for publishing.
              </p>
            )}
          </div>

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
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc" className="text-zinc-300">Description *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={generating}
                  className="text-orange-400 hover:text-orange-300"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Generate
                </Button>
                <span className={`text-xs ${description.length > 1500 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {description.length} / 1500
                </span>
              </div>
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

          {/* Media URL */}
          <div className="space-y-2">
            <Label htmlFor="media" className="text-zinc-300">Media URL (optional)</Label>
            <Input
              id="media"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">CTA Button</Label>
              <Select value={cta} onValueChange={setCta}>
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
                disabled={!cta}
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
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !locationId || !description.trim()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Post'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

