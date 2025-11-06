'use client';

import { useState, useEffect, useMemo } from 'react';
import { ReviewCard } from './review-card';
import { ReviewFilters } from './review-filters';
import type { GMBReview } from '@/lib/types/database';

interface ReviewsFeedProps {
  selectedReview: (GMBReview & { location_name?: string }) | null;
  onSelectReview: (review: GMBReview & { location_name?: string }) => void;
}

type ActiveTab = 'all' | 'pending' | 'responded';

export function ReviewsFeed({ selectedReview, onSelectReview }: ReviewsFeedProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [filters, setFilters] = useState({
    rating: null as string | null,
    location: null as string | null,
    sentiment: null as string | null,
    search: ''
  });
  const [reviews, setReviews] = useState<(GMBReview & { location_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (filters.rating) params.append('rating', filters.rating);
        if (filters.sentiment) params.append('sentiment', filters.sentiment);
        if (filters.search) params.append('search', filters.search);
        
        const res = await fetch(`/api/reviews?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [filters.rating, filters.sentiment, filters.search]);

  // Filter reviews client-side based on active tab
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      if (activeTab === 'pending') {
        return !review.has_reply && !review.has_response && !review.reply_text && !review.review_reply;
      }
      if (activeTab === 'responded') {
        return review.has_reply || review.has_response || review.reply_text || review.review_reply;
      }
      return true; // all
    });
  }, [reviews, activeTab]);

  // Calculate counts
  const counts = useMemo(() => {
    const all = reviews.length;
    const pending = reviews.filter(r => !r.has_reply && !r.has_response && !r.reply_text && !r.review_reply).length;
    const responded = all - pending;
    return { all, pending, responded };
  }, [reviews]);

  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-xl border border-gray-800">
      {/* Header: Tabs */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          {[
            { key: 'all' as ActiveTab, label: 'All', count: counts.all },
            { key: 'pending' as ActiveTab, label: 'Needs Reply', count: counts.pending },
            { key: 'responded' as ActiveTab, label: 'Responded', count: counts.responded }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${activeTab === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <ReviewFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Review Cards Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-gray-400">
            Loading reviews...
          </div>
        )}

        {!isLoading && filteredReviews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">
              {activeTab === 'pending' ? '✅' : '🔍'}
            </div>
            <div className="text-xl text-white mb-2">
              {activeTab === 'pending' ? 'All Caught Up!' : 'No Reviews Found'}
            </div>
            <div className="text-gray-400">
              {activeTab === 'pending' 
                ? 'No pending reviews right now' 
                : 'Try adjusting your filters'}
            </div>
          </div>
        )}

        {filteredReviews.map(review => (
          <ReviewCard
            key={review.id}
            review={review}
            isSelected={selectedReview?.id === review.id}
            onClick={() => onSelectReview(review)}
          />
        ))}
      </div>
    </div>
  );
}

