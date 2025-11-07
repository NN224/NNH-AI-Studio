'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { GMBReview } from '@/lib/types/database';

interface SelectedReviewDetailProps {
  review: GMBReview & { location_name?: string };
}

export function SelectedReviewDetail({ review }: SelectedReviewDetailProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Debug log to see review data structure
  console.log('Selected review data:', review);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null); // Clear previous errors
    
    try {
      // Get the actual review text from 'comment' field (or review_text as fallback)
      const actualReviewText = (review as any).comment || review.review_text || '';
      
      // Don't block if no text - ratings-only reviews are valid!
      // Generate response based on rating if no text is available
      const requestData = {
        review_id: review.id,
        review_text: actualReviewText || `${review.rating}-star rating with no comment`,
        rating: review.rating || 3,
        reviewer_name: review.reviewer_name || 'Valued Customer',
        location_name: review.location_name || 'our business'
      };

      console.log('Generating response with data:', requestData);

      const res = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate response');
      }
      
      setGeneratedResponse(data.response || '');
    } catch (error) {
      console.error('Failed to generate response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate response. Please try again.';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReply = async () => {
    if (!generatedResponse.trim()) return;
    
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: review.id,
          reply_text: generatedResponse
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send reply');
      }

      // Show success message
      alert('Reply sent successfully to Google My Business!');
      
      // Refresh the reviews list
      window.location.reload(); // Or use a better state refresh method

    } catch (error) {
      console.error('Failed to send reply:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reply';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <h3 className="font-semibold text-white">📝 Review Details</h3>
      </div>

      {/* Reviewer Info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold text-lg">
          {review.reviewer_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-semibold text-white">{review.reviewer_name || 'Anonymous'}</div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={14}
                className={star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-sm text-gray-400 space-y-1">
        <div>📍 {review.location_name || 'Unknown Location'}</div>
        <div>
          🕐 Posted{' '}
          <span 
            title={review.review_date || review.created_at ? new Date(review.review_date || review.created_at || '').toLocaleString() : 'Unknown date'}
            className="cursor-help"
          >
            {formatTimeAgo(review.review_date || review.created_at)}
          </span>
        </div>
        {review.ai_sentiment && (
          <div>
            {review.ai_sentiment === 'positive' ? '😊' :
             review.ai_sentiment === 'negative' ? '😞' : '😐'}
            {' '}{review.ai_sentiment}
          </div>
        )}
      </div>

      {/* Review Text */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="text-xs text-gray-400 mb-2">💬 Review:</div>
        {/* Only show "no text" message if review has NO text AND NO reply yet */}
        {!((review as any).comment || review.review_text) && !review.reply_text && !review.has_reply ? (
          <div className="p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg text-sm text-blue-400">
            ℹ️ This review has only a rating, no text comment.
          </div>
        ) : (review as any).comment || review.review_text ? (
          <p className="text-sm text-gray-200 leading-relaxed">
            {(review as any).comment || review.review_text}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">No review text provided</p>
        )}
      </div>

      {/* AI Response Generator */}
      {!generatedResponse ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-white">🤖 AI Response Generator</div>
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>🎯 Generate AI Response</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-medium text-white">✨ AI Generated Response</div>
          <textarea
            value={generatedResponse}
            onChange={(e) => setGeneratedResponse(e.target.value)}
            className="w-full h-32 p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-500"
            placeholder="AI response will appear here..."
          />
          <div className="text-xs text-gray-400">
            {generatedResponse.length}/500 characters
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSendReply}
              disabled={isSending}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSending ? 'Sending...' : '✅ Send Reply to GMB'}
            </button>
            <button 
              onClick={handleGenerate}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: string | undefined | null): string {
  if (!date) {
    console.log('[formatTimeAgo] No date provided');
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
    
    // DEBUG: Log the actual dates (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatTimeAgo] Review date string:', date);
      console.log('[formatTimeAgo] Parsed review date:', reviewDate.toISOString());
      console.log('[formatTimeAgo] Current date:', now.toISOString());
    }
    
    // Check if date is valid
    if (isNaN(reviewDate.getTime())) {
      console.error('[formatTimeAgo] Invalid date:', date);
      return 'Unknown';
    }
    
    const diffMs = now.getTime() - reviewDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatTimeAgo] Difference in days:', diffDays);
    }
    
    if (diffDays < 0) {
      console.warn('[formatTimeAgo] Future date detected:', date, 'Diff:', diffDays, 'days');
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
    console.error('[formatTimeAgo] Date formatting error:', error, date);
    return 'Unknown';
  }
}

