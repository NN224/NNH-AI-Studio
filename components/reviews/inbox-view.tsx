'use client';

import { useState } from 'react';
import { Star, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { GMBReview } from '@/lib/types/database';

interface InboxViewProps {
  reviews: GMBReview[];
  selectedReview: GMBReview | null;
  onSelectReview: (review: GMBReview) => void;
  onReplySuccess: () => void;
}

export function InboxView({ 
  reviews, 
  selectedReview, 
  onSelectReview,
  onReplySuccess
}: InboxViewProps) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Navigate to previous/next review
  const currentIndex = selectedReview ? reviews.findIndex(r => r.id === selectedReview.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < reviews.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      onSelectReview(reviews[currentIndex - 1]);
      setReplyText('');
    }
  };

  const goToNext = () => {
    if (hasNext) {
      onSelectReview(reviews[currentIndex + 1]);
      setReplyText('');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitReply();
      }
    }
  };

  // Generate AI reply
  const handleGenerateAI = async () => {
    if (!selectedReview) return;

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/reviews/ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          reviewText: selectedReview.review_text || '',
          rating: selectedReview.rating,
          locationName: selectedReview.location_name || 'our business',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI reply');
      }

      const data = await response.json();
      setReplyText(data.response);
      toast.success('AI reply generated!');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate AI reply');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Submit reply
  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${selectedReview.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: replyText }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }

      toast.success('Reply posted successfully!');
      setReplyText('');
      onReplySuccess();
      
      // Auto-advance to next review
      if (hasNext) {
        goToNext();
      }
    } catch (error) {
      console.error('Submit reply error:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full gap-4" onKeyDown={handleKeyPress} tabIndex={-1}>
      {/* Left Panel - Review List */}
      <div className="w-96 flex-shrink-0 overflow-auto border-r border-zinc-800 pr-4">
        <div className="space-y-2">
          {reviews.map((review) => {
            const isActive = selectedReview?.id === review.id;
            const needsResponse = !review.has_reply && !review.reply_text;

            return (
              <div
                key={review.id}
                onClick={() => {
                  onSelectReview(review);
                  setReplyText('');
                }}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${isActive 
                    ? 'bg-orange-500/20 border-orange-500/50' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/70'
                  }
                `}
              >
                {/* Review Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-100 truncate">
                      {review.reviewer_name || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <MapPin size={10} />
                      <span className="truncate">{review.location_name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 ml-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        size={12}
                        className={star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-600'}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Preview */}
                {review.review_text && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-2">
                    {review.review_text}
                  </p>
                )}

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={`
                    text-xs px-2 py-0.5 rounded
                    ${needsResponse 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                    }
                  `}>
                    {needsResponse ? '⚠️ Needs Reply' : '✓ Replied'}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatTimeAgo(review.review_date || review.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Review Detail */}
      <div className="flex-1 overflow-auto">
        {selectedReview ? (
          <div className="space-y-4">
            {/* Navigation Bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                  className="border-zinc-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToNext}
                  disabled={!hasNext}
                  className="border-zinc-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-sm text-zinc-400">
                {currentIndex + 1} of {reviews.length}
              </span>
            </div>

            {/* Review Card */}
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              {/* Reviewer Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold text-lg">
                    {selectedReview.reviewer_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-lg">
                      {selectedReview.reviewer_name || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                      <MapPin size={14} />
                      <span>{selectedReview.location_name || 'Unknown Location'}</span>
                      <Clock size={14} className="ml-2" />
                      <span>{formatTimeAgo(selectedReview.review_date || selectedReview.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={20}
                      className={star <= selectedReview.rating ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-600'}
                    />
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                <p className="text-zinc-200 leading-relaxed">
                  {selectedReview.review_text || 'No review text'}
                </p>
              </div>

              {/* Existing Reply (if any) */}
              {selectedReview.reply_text && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                  <div className="text-sm font-medium text-green-400 mb-2">Your Reply:</div>
                  <p className="text-zinc-300">{selectedReview.reply_text}</p>
                </div>
              )}
            </Card>

            {/* Reply Form */}
            {!selectedReview.reply_text && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Write Your Reply</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                    >
                      {isGeneratingAI ? 'Generating...' : '✨ AI Generate'}
                    </Button>
                  </div>

                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={6}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-orange-500"
                  />

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-zinc-500">
                      Tip: Use Ctrl/Cmd + Enter to send quickly
                    </p>
                    <Button
                      onClick={handleSubmitReply}
                      disabled={isSubmitting || !replyText.trim()}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isSubmitting ? 'Posting...' : 'Post Reply'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-500 text-lg mb-2">No review selected</p>
              <p className="text-zinc-600 text-sm">Select a review from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: string | undefined | null): string {
  if (!date) return 'Unknown';
  
  try {
    const now = new Date();
    const reviewDate = new Date(date);
    const diffMs = now.getTime() - reviewDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
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
  } catch {
    return 'Unknown';
  }
}
