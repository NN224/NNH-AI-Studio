'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { syncReviewsFromGoogle } from '@/server/actions/reviews-management';
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache';
import type { GMBReview } from '@/lib/types/database';

interface ReviewStats {
  total: number;
  pending: number;
  replied: number;
  averageRating: number;
  responseRate: number;
}

interface ReviewsPageClientProps {
  readonly locations: ReadonlyArray<{ id: string; location_name: string }>;
  readonly initialFilters?: {
    readonly locationId?: string;
    readonly rating?: number;
    readonly status?: 'pending' | 'replied' | 'responded' | 'flagged' | 'archived';
    readonly sentiment?: 'positive' | 'neutral' | 'negative';
    readonly search?: string;
  };
}

type ViewMode = 'grid' | 'inbox';
type ReviewsHookState = ReturnType<typeof useReviews>;
type ReviewsFilters = ReviewsHookState['filters'];
type UpdateFilterFn = ReviewsHookState['updateFilter'];
type ReviewsPagination = ReviewsHookState['pagination'];

export function ReviewsPageClient({ locations, initialFilters }: ReviewsPageClientProps) {
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(initialFilters?.search || '');
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  
  // View mode state (grid vs inbox)
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: dashboardSnapshot } = useDashboardSnapshot();
  const reviewStatsSummary: ReviewStats | null = useMemo(() => {
    const reviewStats = dashboardSnapshot?.reviewStats;
    if (!reviewStats) return null;
    return {
      total: reviewStats.totals.total ?? 0,
      pending: reviewStats.totals.pending ?? 0,
      replied: reviewStats.totals.replied ?? 0,
      averageRating: reviewStats.averageRating ?? 0,
      responseRate: reviewStats.responseRate ?? 0,
    };
  }, [dashboardSnapshot?.reviewStats]);

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
  const selectedReviews = useMemo(
    () => reviews.filter(r => selectedReviewIds.has(r.id)),
    [reviews, selectedReviewIds]
  );

  const hasActiveFilters = Boolean(
    filters.locationId ||
    filters.rating ||
    filters.status ||
    filters.sentiment ||
    filters.search
  );

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'inbox' && selectionMode) {
      setSelectionMode(false);
      clearSelection();
    }
  };

  // Handle bulk action complete
  const handleBulkActionComplete = () => {
    clearSelection();
    refresh();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 min-h-screen">
      {/* Header */}
      <ReviewsHeaderSection
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectionMode={selectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        canSelectAll={selectionMode && reviews.length > 0}
        onSelectAll={selectAll}
        reviewCount={reviews.length}
        onOpenAiSidebar={() => setAiSidebarOpen(true)}
        onSync={handleSync}
        canSync={Boolean(filters.locationId)}
        isSyncing={isSyncing}
        showSelectionControls={viewMode === 'grid'}
      />

      <ReviewsStatsSection stats={reviewStatsSummary} />

      <ReviewsFiltersSection
        locations={locations}
        filters={filters}
        updateFilter={updateFilter}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onClearFilters={() => {
          updateFilter('locationId', undefined);
          updateFilter('rating', undefined);
          updateFilter('status', undefined);
          updateFilter('sentiment', undefined);
          updateFilter('search', undefined);
          setSearchInput('');
        }}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {viewMode === 'inbox' ? (
          <InboxContent
            reviews={reviews}
            loading={loading}
            error={error}
            filters={filters}
            selectedReview={selectedReview}
            onSelectReview={setSelectedReview}
            onRefresh={refresh}
          />
        ) : (
          <GridContent
            reviews={reviews}
            loading={loading}
            error={error}
            filters={filters}
            selectionMode={selectionMode}
            selectedReview={selectedReview}
            selectedReviewIds={selectedReviewIds}
            onSelectReview={setSelectedReview}
            onReply={handleReply}
            onCheckChange={handleCheckChange}
            hasNextPage={hasNextPage}
            infiniteScrollRef={infiniteScrollRef}
            isLoadingMore={isLoadingMore}
            stats={reviewStatsSummary}
          />
        )}
      </div>

      <PaginationInfo pagination={pagination} visibleCount={reviews.length} />

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
              pendingReviewsCount={reviewStatsSummary?.pending || 0}
              locationId={filters.locationId}
            />
          </div>
        </SheetContent>
      </Sheet>

      <BulkActionBar
        selectedReviews={selectedReviews}
        onClearSelection={clearSelection}
        onActionComplete={handleBulkActionComplete}
      />
    </div>
  );
}

interface ReviewsHeaderSectionProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  canSelectAll: boolean;
  onSelectAll: () => void;
  reviewCount: number;
  onOpenAiSidebar: () => void;
  onSync: () => void;
  canSync: boolean;
  isSyncing: boolean;
  showSelectionControls: boolean;
}

function ReviewsHeaderSection({
  viewMode,
  onViewModeChange,
  selectionMode,
  onToggleSelectionMode,
  canSelectAll,
  onSelectAll,
  reviewCount,
  onOpenAiSidebar,
  onSync,
  canSync,
  isSyncing,
  showSelectionControls,
}: ReviewsHeaderSectionProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 border-b border-zinc-800 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Reviews Management</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage, analyze, and respond to customer reviews
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('grid')}
            className={`h-8 ${viewMode === 'grid' ? 'bg-orange-500 hover:bg-orange-600' : 'hover:bg-zinc-800'}`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" aria-hidden="true" />
            Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'inbox' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('inbox')}
            className={`h-8 ${viewMode === 'inbox' ? 'bg-orange-500 hover:bg-orange-600' : 'hover:bg-zinc-800'}`}
          >
            <Inbox className="w-4 h-4 mr-2" aria-hidden="true" />
            Inbox
          </Button>
        </div>

        {showSelectionControls && (
          <>
            <Button
              onClick={onToggleSelectionMode}
              variant="outline"
              className={`border-zinc-700 text-zinc-300 hover:bg-zinc-800 ${selectionMode ? 'bg-orange-500/20 border-orange-500/50' : ''}`}
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                  Exit Selection
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" aria-hidden="true" />
                  Select Reviews
                </>
              )}
            </Button>

            {canSelectAll && (
              <Button
                onClick={onSelectAll}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Select All ({reviewCount})
              </Button>
            )}
          </>
        )}

        {showSelectionControls && (
          <Button
            onClick={onOpenAiSidebar}
            variant="outline"
            className="lg:hidden border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <Bot className="w-4 h-4 mr-2" aria-hidden="true" />
            AI Assistant
          </Button>
        )}

        <Button
          onClick={onSync}
          disabled={isSyncing || !canSync}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isSyncing ? 'Syncing...' : 'Sync Reviews'}
        </Button>
      </div>
    </div>
  );
}

function ReviewsStatsSection({ stats }: { stats: ReviewStats | null }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Reviews" value={stats.total ?? 0} />
        <StatCard label="Pending" value={stats.pending ?? 0} accent="text-orange-400" />
        <StatCard label="Replied" value={stats.replied ?? 0} accent="text-green-400" />
        <StatCard label="Avg Rating" value={stats.averageRating?.toFixed(1) ?? '0.0'} />
        <StatCard
          label="Response Rate"
          value={`${stats.responseRate?.toFixed(1) ?? '0'}%`}
          accent={stats.responseRate < 50 ? 'text-red-400' : 'text-green-400'}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card className="bg-zinc-900/50 border-orange-500/20">
      <CardContent className="p-6">
        <p className="text-zinc-400 text-sm mb-2">{label}</p>
        <p className={`text-3xl font-bold ${accent ?? 'text-zinc-100'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface ReviewsFiltersSectionProps {
  locations: ReadonlyArray<{ id: string; location_name: string }>;
  filters: ReviewsFilters;
  updateFilter: UpdateFilterFn;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

function ReviewsFiltersSection({
  locations,
  filters,
  updateFilter,
  searchInput,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
}: ReviewsFiltersSectionProps) {
  return (
    <div className="p-6 border-b border-zinc-800">
      <div className="flex flex-col md:flex-row gap-4">
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

        <select
          value={filters.rating || ''}
          onChange={(e) => updateFilter('rating', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Ratings</option>
          <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
          <option value="4">⭐⭐⭐⭐ (4 stars)</option>
          <option value="3">⭐⭐⭐ (3 stars)</option>
          <option value="2">⭐⭐ (2 stars)</option>
          <option value="1">⭐ (1 star)</option>
        </select>

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

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search reviews..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-orange-500"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
            className="text-zinc-400 hover:text-zinc-200"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

interface InboxContentProps {
  reviews: ReadonlyArray<GMBReview>;
  loading: boolean;
  error: string | null;
  filters: ReviewsFilters;
  selectedReview: GMBReview | null;
  onSelectReview: (review: GMBReview) => void;
  onRefresh: () => void;
}

function InboxContent({
  reviews,
  loading,
  error,
  filters,
  selectedReview,
  onSelectReview,
  onRefresh,
}: InboxContentProps) {
  const hasReviews = reviews.length > 0;

  if (error) {
    return (
      <div className="flex-1">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (loading && !hasReviews) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" aria-hidden="true" />
      </div>
    );
  }

  if (!hasReviews) {
    return (
      <div className="flex-1">
        <EmptyState filters={filters} />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <InboxView
        reviews={reviews}
        selectedReview={selectedReview}
        onSelectReview={onSelectReview}
        onReplySuccess={onRefresh}
      />
    </div>
  );
}

interface GridContentProps {
  reviews: ReadonlyArray<GMBReview>;
  loading: boolean;
  error: string | null;
  filters: ReviewsFilters;
  selectionMode: boolean;
  selectedReview: GMBReview | null;
  selectedReviewIds: ReadonlySet<string>;
  onSelectReview: (review: GMBReview) => void;
  onReply: (review: GMBReview) => void;
  onCheckChange: (reviewId: string, checked: boolean) => void;
  hasNextPage: boolean;
  infiniteScrollRef: (node?: Element | null) => void;
  isLoadingMore: boolean;
  stats: ReviewStats | null;
}

function GridContent({
  reviews,
  loading,
  error,
  filters,
  selectionMode,
  selectedReview,
  selectedReviewIds,
  onSelectReview,
  onReply,
  onCheckChange,
  hasNextPage,
  infiniteScrollRef,
  isLoadingMore,
  stats,
}: GridContentProps) {
  const hasReviews = reviews.length > 0;

  return (
    <>
      <div className="flex-1 overflow-auto">
        {error && <ErrorBanner message={error} />}

        {loading && !hasReviews && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" aria-hidden="true" />
          </div>
        )}

        {!loading && !hasReviews && <EmptyState filters={filters} />}

        {hasReviews && (
          <>
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onClick={() => {
                    if (!selectionMode) {
                      onSelectReview(review);
                    }
                  }}
                  isSelected={selectedReview?.id === review.id}
                  onReply={() => onReply(review)}
                  showCheckbox={selectionMode}
                  isChecked={selectedReviewIds.has(review.id)}
                  onCheckChange={(checked) => onCheckChange(review.id, checked)}
                />
              ))}
            </div>

            {hasNextPage && (
              <div ref={infiniteScrollRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" aria-hidden="true" />
                )}
              </div>
            )}

            {!hasNextPage && (
              <div className="text-center py-8">
                <p className="text-zinc-500 text-sm">
                  You&apos;ve reached the end of the list
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-6 h-[calc(100vh-8rem)]">
          <AIAssistantSidebar
            selectedReview={selectedReview}
            pendingReviewsCount={stats?.pending || 0}
            locationId={filters.locationId}
          />
        </div>
      </div>
    </>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
      <p className="text-red-400">{message}</p>
    </div>
  );
}

function EmptyState({ filters }: { filters: ReviewsFilters }) {
  return (
    <div className="text-center py-12">
      <p className="text-zinc-500 text-lg mb-2">No reviews found</p>
      <p className="text-zinc-600 text-sm">
        {filters.locationId
          ? 'Try syncing reviews or adjusting filters'
          : 'Select a location to view reviews'}
      </p>
    </div>
  );
}

function PaginationInfo({
  pagination,
  visibleCount,
}: {
  pagination: ReviewsPagination | null;
  visibleCount: number;
}) {
  if (!pagination) {
    return null;
  }

  return (
    <div className="p-6 border-t border-zinc-800">
      <div className="flex items-center justify-center">
        <p className="text-zinc-400 text-sm">
          Showing {visibleCount} of {pagination.total} reviews
          {pagination.hasNextPage && ' (scroll for more)'}
        </p>
      </div>
    </div>
  );
}
