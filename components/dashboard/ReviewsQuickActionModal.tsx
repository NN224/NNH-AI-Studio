"use client";

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { replyToReview } from '@/server/actions/gmb-reviews';
import { useRouter } from 'next/navigation';

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  review_text?: string | null;
  created_at?: string;
  review_date?: string;
  reviewer_name?: string | null;
}

interface ReviewsQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingReviews: ReviewItem[];
  onSuccess?: (result?: any) => void;
}

export function ReviewsQuickActionModal({
  isOpen,
  onClose,
  pendingReviews,
  onSuccess,
}: ReviewsQuickActionModalProps) {
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSendReply = async () => {
    if (!selectedReview || replyText.trim().length === 0) {
      toast.error('Please enter a reply.');
      return;
    }

    if (replyText.length > 4000) {
      toast.error('Reply is too long. Maximum 4000 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await replyToReview(selectedReview.id, replyText.trim());

      if (result.success) {
        toast.success('Reply posted successfully!', {
          description: 'Your reply is now visible on Google',
        });
        setReplyText('');
        setSelectedReview(null);
        // Let parent handle navigation and modal close
        onSuccess?.(result);
      } else {
        toast.error('Failed to post reply', {
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
      console.error('Error posting reply:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const closeAndReset = () => {
    setSelectedReview(null);
    setReplyText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeAndReset() : null)}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Reply to Reviews</DialogTitle>
          <DialogDescription className="text-zinc-400">
            View pending reviews and send a quick reply.
          </DialogDescription>
        </DialogHeader>

        {!selectedReview ? (
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            {pendingReviews.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No pending reviews 🎉</div>
            ) : (
              pendingReviews.slice(0, 20).map((review) => (
                <Card
                  key={review.id}
                  className="bg-zinc-800/50 border-zinc-700/50 hover:border-orange-500/40 transition-all cursor-pointer"
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-zinc-300">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{review.rating?.toFixed(1) ?? 'N/A'}</span>
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        Pending
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-200 line-clamp-3">
                      {review.comment || review.review_text || 'No review text'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(review.created_at || review.review_date || new Date()).toLocaleString()}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-sm text-zinc-300">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span>{selectedReview.rating?.toFixed(1) ?? 'N/A'}</span>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  Pending
                </Badge>
              </div>
              <p className="text-sm text-zinc-200">{selectedReview.comment || selectedReview.review_text || 'No review text'}</p>
              <p className="text-xs text-zinc-500 mt-2">
                {new Date(selectedReview.created_at || selectedReview.review_date || new Date()).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-300">Your Reply</label>
                <span className={`text-xs ${replyText.length > 4000 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {replyText.length} / 4000
                </span>
              </div>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[120px]"
                maxLength={4100}
              />
              {replyText.length > 4000 && (
                <p className="text-xs text-red-400">Reply exceeds the 4000 character limit</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedReview(null)}
                className="text-zinc-300 hover:text-zinc-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendReply}
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


