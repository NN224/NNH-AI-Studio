"use client";

/**
 * 📝 APPROVAL CARD COMPONENT
 *
 * Shows a pending action (review reply/question answer) with:
 * - Original review/question
 * - AI-generated response
 * - Confidence score
 * - Approve/Edit/Reject actions
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Edit3,
  Loader2,
  Sparkles,
  AlertTriangle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface PendingAction {
  id: string;
  actionType: "review_reply" | "question_answer" | "post";
  referenceData: {
    reviewerName?: string;
    rating?: number;
    reviewText?: string;
    questionText?: string;
  };
  aiGeneratedContent: string;
  aiConfidence: number;
  requiresAttention: boolean;
  attentionReason?: string;
}

interface ApprovalCardProps {
  action: PendingAction;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  isProcessing: boolean;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-zinc-600 text-zinc-600",
          )}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ApprovalCard({
  action,
  onApprove,
  onReject,
  onEdit,
  isProcessing,
}: ApprovalCardProps) {
  const isReview = action.actionType === "review_reply";
  const isNegative = (action.referenceData.rating || 5) <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isNegative
          ? "bg-red-500/10 border-red-500/30"
          : "bg-zinc-800/50 border-zinc-700",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isReview && (
            <RatingStars rating={action.referenceData.rating || 0} />
          )}
          <span className="text-sm font-medium text-zinc-200">
            {action.referenceData.reviewerName || "Customer"}
          </span>
          {action.requiresAttention && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Attention
            </Badge>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            action.aiConfidence >= 85
              ? "border-green-500/50 text-green-400"
              : action.aiConfidence >= 70
                ? "border-yellow-500/50 text-yellow-400"
                : "border-red-500/50 text-red-400",
          )}
        >
          {action.aiConfidence}% confidence
        </Badge>
      </div>

      {/* Original Review/Question */}
      {action.referenceData.reviewText && (
        <p className="text-sm text-zinc-400 bg-zinc-900/50 rounded-lg p-3 border-r-2 border-zinc-600">
          "{action.referenceData.reviewText}"
        </p>
      )}

      {/* AI Generated Reply */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Suggested reply:
        </p>
        <p className="text-sm text-zinc-200 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-lg p-3 border border-orange-500/20">
          {action.aiGeneratedContent}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          disabled={isProcessing}
          className="gap-1.5"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReject}
          disabled={isProcessing}
          className="text-zinc-400 hover:text-red-400 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </motion.div>
  );
}
