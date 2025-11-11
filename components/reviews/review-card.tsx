'use client';

import { Star, MapPin, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { GMBReview } from '@/lib/types/database';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  readonly review: GMBReview & { location_name?: string };
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly onReply?: () => void;
  readonly showCheckbox?: boolean;
  readonly isChecked?: boolean;
  readonly onCheckChange?: (checked: boolean) => void;
}

export function ReviewCard({
  review,
  isSelected,
  onClick,
  onReply,
  showCheckbox = false,
  isChecked = false,
  onCheckChange,
}: ReviewCardProps) {
  const needsResponse = !review.has_reply && !review.reply_text && !review.response_text;
  const isNegative = review.rating <= 2;
  const isInteractive = Boolean(onClick);
  const cardStateClasses = getReviewCardStateClass({
    isSelected: Boolean(isSelected),
    needsResponse,
    isNegative,
  });
  const actionButtonClasses = getActionButtonClass(needsResponse);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative p-4 rounded-lg border-l-4 transition-all',
        cardStateClasses,
        onClick ? 'cursor-pointer' : undefined,
        isChecked ? 'ring-2 ring-orange-500/70' : undefined
      )}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? Boolean(isSelected) : undefined}
    >
      {/* Checkbox (absolute positioned in top-left) */}
      {showCheckbox && (
        <div 
          className="absolute top-3 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => onCheckChange?.(checked === true)}
            className="border-zinc-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            aria-label={`Select review from ${review.reviewer_name || 'Anonymous'}`}
          />
        </div>
      )}

      {/* Header */}
      <div className={`flex items-start justify-between mb-3 ${showCheckbox ? 'ml-8' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold">
            {review.reviewer_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-semibold text-white">{review.reviewer_name || 'Anonymous'}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MapPin size={12} />
              <span>{review.location_name || 'Unknown Location'}</span>
              <Clock size={12} className="ml-2" />
              <span 
                title={review.review_date || review.created_at ? new Date(review.review_date || review.created_at || '').toLocaleString() : 'Unknown date'}
                className="cursor-help"
              >
                {formatTimeAgo(review.review_date || review.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              size={16}
              className={star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Review Text */}
      {review.review_text && (
        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
          {review.review_text}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Status/Tags */}
        <div className="flex items-center gap-2">
          {needsResponse ? (
            <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
              Needs Response
            </span>
          ) : (
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 flex items-center gap-1">
              ✓ Replied
            </span>
          )}
          
          {review.ai_sentiment && (
            <span className={`
              px-2 py-1 rounded text-xs font-medium
              ${review.ai_sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                review.ai_sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'}
            `}>
              {review.ai_sentiment === 'positive' ? '😊' :
               review.ai_sentiment === 'negative' ? '😞' : '😐'}
              {' '}{review.ai_sentiment}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        {onReply && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onReply();
            }}
            type="button"
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
              actionButtonClasses
            )}
          >
            {needsResponse ? '💬 Reply' : '✏️ Edit Reply'}
          </button>
        )}
      </div>

      {/* Reply Preview (if exists) */}
      {(review.reply_text || review.response_text || review.review_reply) && (
        <div className="mt-3 pt-3 border-t border-zinc-700">
          <div className="text-xs text-zinc-400 mb-1">Your Reply:</div>
          <p className="text-sm text-zinc-300 line-clamp-2">
            {review.reply_text || review.response_text || review.review_reply}
          </p>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: string | undefined | null): string {
  if (!date) {
    return 'Unknown';
  }
  
  try {
    const now = new Date();
    
    // Force UTC parsing if the date doesn't have timezone info
    // Most database dates are stored in UTC but may not have 'Z' suffix
    let reviewDate: Date;
    // Check if date has timezone info (Z, +HH:MM, or -HH:MM pattern)
    const hasTimezone = date.includes('Z') || 
                       /[+-]\d{2}:\d{2}$/.test(date) || 
                       /[+-]\d{4}$/.test(date);
    
    if (hasTimezone) {
      // Has timezone info, parse as-is
      reviewDate = new Date(date);
    } else {
      // No timezone info, assume UTC (add Z suffix)
      reviewDate = new Date(date + 'Z');
    }
    
    // Check if date is valid
    if (isNaN(reviewDate.getTime())) {
      return 'Unknown';
    }
    
    const diffMs = now.getTime() - reviewDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Recently';
    }
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } catch (error) {
    return 'Unknown';
  }
}

function getReviewCardStateClass({
  isSelected,
  needsResponse,
  isNegative,
}: {
  isSelected: boolean;
  needsResponse: boolean;
  isNegative: boolean;
}) {
  if (isSelected) {
    return 'bg-orange-500/10 border-l-orange-500 ring-2 ring-orange-500/50';
  }

  if (needsResponse && isNegative) {
    return 'bg-red-950/20 border-l-red-500 hover:bg-red-950/30';
  }

  if (needsResponse) {
    return 'bg-orange-950/20 border-l-orange-500 hover:bg-orange-950/30';
  }

  return 'bg-zinc-800/50 border-l-green-500 hover:bg-zinc-800';
}

function getActionButtonClass(needsResponse: boolean) {
  return needsResponse
    ? 'bg-orange-500 hover:bg-orange-600 text-white'
    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300';
}
