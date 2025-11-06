'use client';

interface ReviewFiltersProps {
  filters: {
    rating: string | null;
    location: string | null;
    sentiment: string | null;
    search: string;
  };
  onChange: (filters: {
    rating: string | null;
    location: string | null;
    sentiment: string | null;
    search: string;
  }) => void;
}

export function ReviewFilters({ filters, onChange }: ReviewFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search reviews..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.rating || ''}
          onChange={(e) => onChange({ ...filters, rating: e.target.value || null })}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-orange-500"
        >
          <option value="">⭐ All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>

        <select
          value={filters.sentiment || ''}
          onChange={(e) => onChange({ ...filters, sentiment: e.target.value || null })}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-orange-500"
        >
          <option value="">😊 All Sentiments</option>
          <option value="positive">😊 Positive</option>
          <option value="neutral">😐 Neutral</option>
          <option value="negative">😞 Negative</option>
        </select>

        {(filters.rating || filters.sentiment || filters.search) && (
          <button
            onClick={() => onChange({ rating: null, sentiment: null, search: '', location: null })}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

