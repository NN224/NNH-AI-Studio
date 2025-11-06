'use client';

import { useState } from 'react';
import { StatsCards } from '@/components/reviews/stats-cards';
import { ReviewsFeed } from '@/components/reviews/reviews-feed';
import { AIAssistantPanel } from '@/components/reviews/ai-assistant-panel';
import type { GMBReview } from '@/lib/types/database';

export default function ReviewsPage() {
  const [selectedReview, setSelectedReview] = useState<(GMBReview & { location_name?: string }) | null>(null);

  return (
    <div className="flex flex-col h-full bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage, analyze, and respond to customer reviews with AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">🔔</button>
          <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">⚙️</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <StatsCards />
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden min-h-0">
        {/* Left: Reviews Feed (60%) */}
        <div className="w-[60%] flex flex-col min-h-0">
          <ReviewsFeed 
            selectedReview={selectedReview}
            onSelectReview={setSelectedReview}
          />
        </div>

        {/* Right: AI Assistant Panel (40%) */}
        <div className="w-[40%] min-h-0">
          <AIAssistantPanel selectedReview={selectedReview} />
        </div>
      </div>
    </div>
  );
}
