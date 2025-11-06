'use client';

import { Star, MapPin, Clock } from 'lucide-react';
import type { GMBReview } from '@/lib/types/database';

interface ReviewCardProps {
  review: GMBReview & { location_name?: string };
  isSelected?: boolean;
  onClick: () => void;
}

export function ReviewCard({ review, isSelected, onClick }: ReviewCardProps) {
  const needsResponse = !review.has_reply && !review.has_response && !review.reply_text && !review.review_reply;
  const isNegative = review.rating <= 2;
  const isPositive = review.rating >= 4;

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border-l-4 cursor-pointer transition-all
        ${isSelected 
          ? 'bg-orange-500/10 border-l-orange-500 ring-2 ring-orange-500/50' 
          : needsResponse && isNegative
            ? 'bg-red-950/20 border-l-red-500 hover:bg-red-950/30'
            : needsResponse
              ? 'bg-orange-950/20 border-l-orange-500 hover:bg-orange-950/30'
              : 'bg-gray-800/50 border-l-green-500 hover:bg-gray-800'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
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
              <span>{formatTimeAgo(review.review_date || review.created_at)}</span>
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
        {needsResponse && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onClick();
            }}
            className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors"
          >
            🤖 Generate Reply
          </button>
        )}
      </div>

      {/* Reply Preview (if exists) */}
      {review.reply_text && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Your Reply:</div>
          <p className="text-sm text-gray-300 line-clamp-2">{review.reply_text}</p>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: string | undefined | null): string {
  if (!date) return 'Unknown';
  const now = new Date();
  const reviewDate = new Date(date);
  const diffMs = now.getTime() - reviewDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}
