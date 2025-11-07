'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  replyToReview,
  updateReply,
  deleteReply,
  syncReviewsFromGoogle,
} from '@/server/actions/reviews-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search } from 'lucide-react';
import { ReviewCard } from './review-card';
import { ReplyDialog } from './reply-dialog';
import type { GMBReview } from '@/lib/types/database';

interface ReviewStats {
  total: number;
  pending: number;
  replied: number;
  averageRating: number;
  responseRate: number;
}

interface ReviewsClientPageProps {
  initialReviews: GMBReview[];
  stats: ReviewStats | null;
  totalCount: number;
  locations: Array<{ id: string; location_name: string }>;
  currentFilters: {
    locationId?: string;
    rating?: number;
    status?: string;
    searchQuery?: string;
    page?: number;
  };
}

export function ReviewsClientPage({
  initialReviews,
  stats,
  totalCount,
  locations,
  currentFilters,
}: ReviewsClientPageProps) {
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Update filter in URL
  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filters change
    if (key !== 'page') {
      params.set('page', '1');
    }

    router.push(`/reviews?${params.toString()}`);
  };

  // Handle sync
  const handleSync = async () => {
    if (!currentFilters.locationId) {
      toast.error('Please select a location first');
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncReviewsFromGoogle(currentFilters.locationId);

      if (result.success) {
        toast.success('Reviews synced!', {
          description: result.message,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error('Sync failed', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle reply
  const handleReply = (review: GMBReview) => {
    setSelectedReview(review);
    setReplyDialogOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / 50);
  const currentPage = currentFilters.page || 1;

  return (
    <div className="flex flex-col h-full bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 border-b border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Reviews Management</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage, analyze, and respond to customer reviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSync}
            disabled={isSyncing || !currentFilters.locationId}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Reviews'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Total Reviews</p>
                <p className="text-3xl font-bold text-zinc-100">{stats.total || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Pending</p>
                <p className="text-3xl font-bold text-orange-400">{stats.pending || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Replied</p>
                <p className="text-3xl font-bold text-green-400">{stats.replied || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Avg Rating</p>
                <p className="text-3xl font-bold text-zinc-100">
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Response Rate</p>
                <p className={`text-3xl font-bold ${stats.responseRate < 50 ? 'text-red-400' : 'text-green-400'}`}>
                  {stats.responseRate?.toFixed(1) || '0'}%
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Location Filter */}
          <select
            value={currentFilters.locationId || ''}
            onChange={(e) => updateFilter('location', e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={currentFilters.rating || ''}
            onChange={(e) => updateFilter('rating', e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
            <option value="4">⭐⭐⭐⭐ (4 stars)</option>
            <option value="3">⭐⭐⭐ (3 stars)</option>
            <option value="2">⭐⭐ (2 stars)</option>
            <option value="1">⭐ (1 star)</option>
          </select>

          {/* Status Filter */}
          <select
            value={currentFilters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Reply</option>
            <option value="replied">Replied</option>
            <option value="responded">Responded</option>
            <option value="flagged">Flagged</option>
            <option value="archived">Archived</option>
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search reviews..."
              defaultValue={currentFilters.searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                const timeoutId = setTimeout(() => {
                  updateFilter('search', value || null);
                }, 500);
                return () => clearTimeout(timeoutId);
              }}
              className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-orange-500"
            />
          </div>

          {/* Clear Filters */}
          {(currentFilters.locationId ||
            currentFilters.rating ||
            currentFilters.status ||
            currentFilters.searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => router.push('/reviews')}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="flex-1 p-6 overflow-auto">
        {isPending && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        )}

        {!isPending && initialReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-lg mb-2">No reviews found</p>
            <p className="text-zinc-600 text-sm">
              {currentFilters.locationId
                ? 'Try syncing reviews or adjusting filters'
                : 'Select a location to view reviews'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {initialReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onReply={() => handleReply(review)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => updateFilter('page', (currentPage - 1).toString())}
              className="border-zinc-700 text-zinc-300"
            >
              Previous
            </Button>

            <span className="text-zinc-400 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => updateFilter('page', (currentPage + 1).toString())}
              className="border-zinc-700 text-zinc-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reply Dialog */}
      <ReplyDialog
        review={selectedReview}
        isOpen={replyDialogOpen}
        onClose={() => {
          setReplyDialogOpen(false);
          setSelectedReview(null);
        }}
        onSuccess={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}

