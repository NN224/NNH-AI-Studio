'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { updatePost } from '@/server/actions/posts-management';
import { Loader2 } from 'lucide-react';
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

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setDescription(post.content || '');
      setMediaUrl(post.media_url || '');
      setCta(post.call_to_action || '');
      setCtaUrl(post.call_to_action_url || '');
      setScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '');
    }
  }, [post]);

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

          {/* Media URL */}
          <div className="space-y-2">
            <Label htmlFor="media" className="text-zinc-300">Media URL (optional)</Label>
            <Input
              id="media"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              disabled={!canEdit}
            />
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
                disabled={!cta || !canEdit}
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
            />
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

