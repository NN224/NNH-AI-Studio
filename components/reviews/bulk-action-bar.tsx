'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, XCircle, Tag, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { GMBReview } from '@/lib/types/database';

interface BulkActionBarProps {
  selectedReviews: GMBReview[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionBar({ selectedReviews, onClearSelection, onActionComplete }: BulkActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkAsRead = async () => {
    setIsProcessing(true);
    try {
      // TODO: Implement mark as read API call
      toast.success(`Marked ${selectedReviews.length} review(s) as read`);
      onActionComplete();
    } catch (error) {
      toast.error('Failed to mark reviews as read');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsUnread = async () => {
    setIsProcessing(true);
    try {
      // TODO: Implement mark as unread API call
      toast.success(`Marked ${selectedReviews.length} review(s) as unread`);
      onActionComplete();
    } catch (error) {
      toast.error('Failed to mark reviews as unread');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveReplies = async () => {
    setIsProcessing(true);
    try {
      // Filter reviews that have AI-generated replies
      const reviewsWithReplies = selectedReviews.filter(
        r => r.ai_generated_response || r.ai_suggested_reply
      );

      if (reviewsWithReplies.length === 0) {
        toast.error('No AI-generated replies to approve');
        setIsProcessing(false);
        return;
      }

      // TODO: Implement bulk approve and post API call
      let successCount = 0;
      let failCount = 0;

      for (const review of reviewsWithReplies) {
        try {
          const response = await fetch(`/api/reviews/${review.id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reply_text: review.ai_generated_response || review.ai_suggested_reply,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully posted ${successCount} reply(ies)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to post ${failCount} reply(ies)`);
      }

      onActionComplete();
    } catch (error) {
      toast.error('Failed to approve replies');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLabel = async () => {
    setIsProcessing(true);
    try {
      // TODO: Implement add label dialog and API call
      toast.info('Label feature coming soon!');
      onActionComplete();
    } catch (error) {
      toast.error('Failed to add label');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedReviews.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-zinc-900 border border-orange-500/30 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {selectedReviews.length}
          </div>
          <span className="text-zinc-300 font-medium">
            {selectedReviews.length} review{selectedReviews.length > 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="w-px h-8 bg-zinc-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAsRead}
            disabled={isProcessing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Read
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAsUnread}
            disabled={isProcessing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Mark Unread
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleApproveReplies}
            disabled={isProcessing}
            className="border-green-700 text-green-400 hover:bg-green-500/10"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Approve & Post Replies
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddLabel}
            disabled={isProcessing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Tag className="w-4 h-4 mr-2" />
            Add Label
          </Button>
        </div>

        <div className="w-px h-8 bg-zinc-700" />

        {/* Clear Selection */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={isProcessing}
          className="text-zinc-400 hover:text-zinc-200"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
