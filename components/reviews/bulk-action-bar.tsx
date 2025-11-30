"use client";

import { Button } from "@/components/ui/button";
import type { GMBReview } from "@/lib/types/database";
import { replyToReview } from "@/server/actions/reviews-management";
import { CheckCircle, MessageSquare, Tag, X, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BulkActionBarProps {
  readonly selectedReviews: ReadonlyArray<GMBReview>;
  readonly onClearSelection: () => void;
  readonly onActionComplete: () => void;
}

export function BulkActionBar({
  selectedReviews,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const selectedCount = selectedReviews.length;

  if (selectedCount === 0) {
    return null;
  }

  const runBulkAction = async (action: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await action();
      onActionComplete();
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsRead = () =>
    runBulkAction(async () => {
      await bulkUpdateReviewStatus(selectedReviews, "read");
      toast.success(
        `Marked ${selectedCount} review${selectedCount > 1 ? "s" : ""} as read`,
      );
    });

  const handleMarkAsUnread = () =>
    runBulkAction(async () => {
      await bulkUpdateReviewStatus(selectedReviews, "unread");
      toast.success(
        `Marked ${selectedCount} review${selectedCount > 1 ? "s" : ""} as unread`,
      );
    });

  const handleApproveReplies = () =>
    runBulkAction(async () => {
      const reviewsWithReplies = selectedReviews.filter(
        (r) => r.ai_generated_response || r.ai_suggested_reply,
      );

      if (reviewsWithReplies.length === 0) {
        toast.error("No AI-generated replies to approve");
        return;
      }

      const { successCount, failCount } =
        await bulkPostReplies(reviewsWithReplies);

      if (successCount > 0) {
        toast.success(
          `Successfully posted ${successCount} repl${successCount > 1 ? "ies" : "y"}`,
        );
      }
      if (failCount > 0) {
        toast.error(
          `Failed to post ${failCount} repl${failCount > 1 ? "ies" : "y"}`,
        );
      }
    });

  const handleAddLabel = () =>
    runBulkAction(async () => {
      await notePendingFeature("bulk-labels");
      toast.info("Label support is coming soon.");
    });

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div
        className="bg-zinc-900 border border-orange-500/30 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {selectedCount}
          </div>
          <span className="text-zinc-300 font-medium">
            {selectedCount} review{selectedCount > 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="w-px h-8 bg-zinc-700" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleMarkAsRead}
            disabled={isProcessing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            Mark Read
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleMarkAsUnread}
            disabled={isProcessing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <XCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            Mark Unread
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleApproveReplies}
            disabled={isProcessing}
            className="border-green-700 text-green-400 hover:bg-green-500/10"
          >
            <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
            Approve &amp; Post Replies
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddLabel}
            disabled={isProcessing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Tag className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Label
          </Button>
        </div>

        <div className="w-px h-8 bg-zinc-700" aria-hidden="true" />

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={isProcessing}
          className="text-zinc-400 hover:text-zinc-200"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

async function bulkUpdateReviewStatus(
  _reviews: ReadonlyArray<GMBReview>,
  _status: "read" | "unread",
) {
  // Placeholder for future API integration
  // TODO: Implement bulk status update when API is ready
}

async function bulkPostReplies(reviews: ReadonlyArray<GMBReview>) {
  let successCount = 0;
  let failCount = 0;

  await Promise.all(
    reviews.map(async (review) => {
      try {
        const replyText =
          review.ai_generated_response || review.ai_suggested_reply;
        if (!replyText) {
          failCount += 1;
          return;
        }

        // Use Server Action instead of fetch
        const result = await replyToReview(review.id, replyText);

        if (result.success) {
          successCount += 1;
        } else {
          failCount += 1;
        }
      } catch (error) {
        console.error("bulkPostReplies error:", error);
        failCount += 1;
      }
    }),
  );

  return { successCount, failCount };
}

async function notePendingFeature(_featureKey: string) {
  // Feature not yet enabled - placeholder for future implementation
}
