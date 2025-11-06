'use client';

import { AutoReplySettings } from './auto-reply-settings';
import { SelectedReviewDetail } from './selected-review-detail';
import type { GMBReview } from '@/lib/types/database';

interface AIAssistantPanelProps {
  selectedReview: (GMBReview & { location_name?: string }) | null;
}

export function AIAssistantPanel({ selectedReview }: AIAssistantPanelProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-xl border border-gray-800">
      {/* Auto Reply Settings (Collapsible) */}
      <div className="p-4 border-b border-gray-800">
        <AutoReplySettings />
      </div>

      {/* Selected Review Detail OR Empty State */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedReview ? (
          <SelectedReviewDetail review={selectedReview} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Select a Review to Begin
            </h3>
            <p className="text-gray-400 text-sm">
              Click any review to generate AI responses,<br />
              view details, or reply manually
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

