'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { GMBReview } from '@/lib/types/database';

interface SelectedReviewDetailProps {
  review: GMBReview & { location_name?: string };
}

export function SelectedReviewDetail({ review }: SelectedReviewDetailProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Debug log to see review data structure
  console.log('Selected review data:', review);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null); // Clear previous errors
    
    try {
      // Validate and prepare data with fallbacks
      const requestData = {
        review_id: review.id,
        review_text: review.review_text || 'No review text provided',
        rating: review.rating || 3,
        reviewer_name: review.reviewer_name || 'Valued Customer',
        location_name: review.location_name || 'our business'
      };

      console.log('Generating response with data:', requestData); // Debug log

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
    } catch (error: any) {
      console.error('Failed to generate response:', error);
      setError(error.message || 'Failed to generate response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReply = async () => {
    if (!generatedResponse.trim()) return;
    
    try {
      const res = await fetch(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: generatedResponse
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send reply');
      }
      
      const data = await res.json();
      if (data.success) {
        alert('Reply sent successfully!');
        setGeneratedResponse('');
        // Refresh the page to show updated review
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert(`Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <div>🕐 Posted {formatTimeAgo(review.review_date || review.created_at)}</div>
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
        <p className="text-sm text-gray-200 leading-relaxed">
          {review.review_text || 'No review text provided'}
        </p>
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
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              ✅ Send Reply
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

