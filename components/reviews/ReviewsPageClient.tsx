'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RefreshCw, Search, Bot, Loader2, CheckSquare, Square, LayoutGrid, Inbox } from 'lucide-react';
import { ReviewCard } from './review-card';
import { ReplyDialog } from './reply-dialog';
import { AIAssistantSidebar } from './ai-assistant-sidebar';
import { BulkActionBar } from './bulk-action-bar';
import { InboxView } from './inbox-view';
import { useReviews } from '@/hooks/use-reviews';
import { syncReviewsFromGoogle, getReviewStats } from '@/server/actions/reviews-management';
import type { GMBReview } from '@/lib/types/database';

interface ReviewStats {
  total: number;
  pending: number;
  replied: number;
  averageRating: number;
  responseRate: number;
}

interface ReviewFilters {
  locationId?: string;
  rating?: number;
  status?: string;
  sentiment?: string;
  search?: string;
}

interface ReviewsPageClientProps {
  locations: Array<{ id: string; location_name: string }>;
  initialFilters?: ReviewFilters;
}

export function ReviewsPageClient({ locations, initialFilters }: ReviewsPageClientProps) {
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [searchInput, setSearchInput] = useState(initialFilters?.search || '');
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  
  // View mode state (grid vs inbox)
  const [viewMode, setViewMode] = useState<'grid' | 'inbox'>('grid');

  // Use infinite scroll by default
  const {
    reviews,
    loading,
    error,
    pagination,
    filters,
    updateFilter,
    loadMore,
    hasNextPage,
    isLoadingMore,
    refresh,
  } = useReviews({
    initialFilters: initialFilters || {},
    pageSize: 20,
    infiniteScroll: true,
  });

  // Infinite scroll trigger
  const { ref: infiniteScrollRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Load more when scroll trigger is in view
  useEffect(() => {
    if (inView && hasNextPage && !isLoadingMore && !loading) {
      loadMore();
    }
  }, [inView, hasNextPage, isLoadingMore, loading, loadMore]);

  // Fetch stats when location filter changes
  useEffect(() => {
    const fetchStats = async () => {
      const result = await getReviewStats(filters.locationId);
      if (result.success && result.data) {
        setStats(result.data);
      }
    };
    fetchStats();
  }, [filters.locationId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        updateFilter('search', searchInput || undefined);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, updateFilter]);

  // Handle sync
  const handleSync = async () => {
    if (!filters.locationId) {
      toast.error('Please select a location first');
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncReviewsFromGoogle(filters.locationId);

      if (result.success) {
        toast.success('Reviews synced!', {
          description: result.message,
        });
        await refresh();
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

  // Handle checkbox change
  const handleCheckChange = (reviewId: string, checked: boolean) => {
    setSelectedReviewIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(reviewId);
      } else {
        newSet.delete(reviewId);
      }
      return newSet;
    });
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedReviewIds(new Set());
    }
  };

  // Select all visible reviews
  const selectAll = () => {
    setSelectedReviewIds(new Set(reviews.map(r => r.id)));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedReviewIds(new Set());
  };

  // Get selected review objects
  const selectedReviews = reviews.filter(r => selectedReviewIds.has(r.id));

  // Handle bulk action complete
  const handleBulkActionComplete = () => {
    clearSelection();
    refresh();
  };

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
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className={`h-8 ${viewMode === 'grid' ? 'bg-orange-500 hover:bg-orange-600' : 'hover:bg-zinc-800'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'inbox' ? 'default' : 'ghost'}
              onClick={() => setViewMode('inbox')}
              className={`h-8 ${viewMode === 'inbox' ? 'bg-orange-500 hover:bg-orange-600' : 'hover:bg-zinc-800'}`}
            >
              <Inbox className="w-4 h-4 mr-2" />
              Inbox
            </Button>
          </div>

          {/* Selection Mode Toggle (only in grid view) */}
          {viewMode === 'grid' && (
            <Button
              onClick={toggleSelectionMode}
              variant="outline"
              className={`border-zinc-700 text-zinc-300 hover:bg-zinc-800 ${selectionMode ? 'bg-orange-500/20 border-orange-500/50' : ''}`}
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Exit Selection
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Select Reviews
                </>
              )}
            </Button>
          )}

          {/* Select All (only show in selection mode) */}
          {selectionMode && reviews.length > 0 && viewMode === 'grid' && (
            <Button
              onClick={selectAll}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Select All ({reviews.length})
            </Button>
          )}

          {/* Mobile AI Assistant Button (only in grid view) */}
          {viewMode === 'grid' && (
            <Button
              onClick={() => setAiSidebarOpen(true)}
              variant="outline"
              className="lg:hidden border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI Assistant
            </Button>
          )}
          <Button
            onClick={handleSync}
            disabled={isSyncing || !filters.locationId}
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
            value={filters.locationId || ''}
            onChange={(e) => updateFilter('locationId', e.target.value || undefined)}
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
            value={filters.rating || ''}
            onChange={(e) => updateFilter('rating', e.target.value ? parseInt(e.target.value) : undefined)}
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
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || undefined)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Reply</option>
            <option value="replied">Replied</option>
            <option value="responded">Responded</option>
            <option value="flagged">Flagged</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sentiment Filter */}
          <select
            value={filters.sentiment || ''}
            onChange={(e) => updateFilter('sentiment', e.target.value || undefined)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search reviews..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-orange-500"
            />
          </div>

          {/* Clear Filters */}
          {(filters.locationId || filters.rating || filters.status || filters.sentiment || filters.search) && (
            <Button
              variant="ghost"
              onClick={() => {
                updateFilter('locationId', undefined);
                updateFilter('rating', undefined);
                updateFilter('status', undefined);
                updateFilter('sentiment', undefined);
                updateFilter('search', undefined);
                setSearchInput('');
              }}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Conditional Layout Based on View Mode */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {viewMode === 'inbox' ? (
          /* Inbox View */
          <div className="flex-1">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {loading && reviews.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500 text-lg mb-2">No reviews found</p>
                <p className="text-zinc-600 text-sm">
                  {filters.locationId
                    ? 'Try syncing reviews or adjusting filters'
                    : 'Select a location to view reviews'}
                </p>
              </div>
            ) : (
              <InboxView
                reviews={reviews}
                selectedReview={selectedReview}
                onSelectReview={setSelectedReview}
                onReplySuccess={refresh}
              />
            )}
          </div>
        ) : (
          /* Grid View */
          <>
            {/* Reviews List - Left Side */}
            <div className="flex-1 overflow-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {loading && reviews.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-lg mb-2">No reviews found</p>
              <p className="text-zinc-600 text-sm">
                {filters.locationId
                  ? 'Try syncing reviews or adjusting filters'
                  : 'Select a location to view reviews'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onClick={() => !selectionMode && setSelectedReview(review)}
                    isSelected={selectedReview?.id === review.id}
                    onReply={() => handleReply(review)}
                    showCheckbox={selectionMode}
                    isChecked={selectedReviewIds.has(review.id)}
                    onCheckChange={(checked) => handleCheckChange(review.id, checked)}
                  />
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              {hasNextPage && (
                <div ref={infiniteScrollRef} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  )}
                </div>
              )}

              {/* End of List Indicator */}
              {!hasNextPage && reviews.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-zinc-500 text-sm">
                    You've reached the end of the list
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* AI Assistant Sidebar - Right Side (only in grid view) */}
        {viewMode === 'grid' && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <div className="sticky top-6 h-[calc(100vh-8rem)]">
              <AIAssistantSidebar
                selectedReview={selectedReview}
                pendingReviewsCount={stats?.pending || 0}
                locationId={filters.locationId}
              />
            </div>
          </div>
        )}
      </>
        )}
      </div>

      {/* Pagination Info */}
      {pagination && (
        <div className="p-6 border-t border-zinc-800">
          <div className="flex items-center justify-center">
            <p className="text-zinc-400 text-sm">
              Showing {reviews.length} of {pagination.total} reviews
              {pagination.hasNextPage && ' (scroll for more)'}
            </p>
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
          refresh();
        }}
      />

      {/* Mobile AI Assistant Sheet */}
      <Sheet open={aiSidebarOpen} onOpenChange={setAiSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 p-0 overflow-y-auto">
          <SheetHeader className="p-6 border-b border-zinc-800">
            <SheetTitle className="text-white">AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <AIAssistantSidebar
              selectedReview={selectedReview}
              pendingReviewsCount={stats?.pending || 0}
              locationId={filters.locationId}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedReviews={selectedReviews}
        onClearSelection={clearSelection}
        onActionComplete={handleBulkActionComplete}
      />
    </div>
  );
}
