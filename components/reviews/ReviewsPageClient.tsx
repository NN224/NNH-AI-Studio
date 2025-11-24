'use client'

import { t } from '@/lib/i18n/stub'
import type { ComponentType } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInView } from 'react-intersection-observer'
import { toast } from 'sonner'
import {
  RefreshCw,
  Search,
  Bot,
  Loader2,
  CheckSquare,
  Square,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Clock3,
  Star,
  Pause,
  XCircle,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ReviewCard } from './review-card'
import { ReplyDialog } from './reply-dialog'
import { ReviewAISettings } from './ReviewAISettings'
import { AIAssistantSidebar } from './ai-assistant-sidebar'
import { BulkActionBar } from './bulk-action-bar'
import { AutoReplySettingsPanel } from './auto-reply-settings-panel'
import { useReviews } from '@/hooks/use-reviews'
import { syncReviewsFromGoogle } from '@/server/actions/reviews-management'
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache'
import type { GMBReview } from '@/lib/types/database'

interface ReviewStats {
  total: number
  pending: number
  replied: number
  averageRating: number
  responseRate: number
  byRating: Record<number, number>
}

interface ReviewsPageClientProps {
  readonly locations: ReadonlyArray<{ id: string; location_name: string }>
  readonly initialFilters?: {
    readonly locationId?: string
    readonly rating?: number
    readonly status?: 'pending' | 'replied' | 'responded' | 'flagged' | 'archived'
    readonly sentiment?: 'positive' | 'neutral' | 'negative'
    readonly search?: string
  }
}

type ReviewsHookState = ReturnType<typeof useReviews>
type ReviewsFilters = ReviewsHookState['filters']
type UpdateFilterFn = ReviewsHookState['updateFilter']

export function ReviewsPageClient({ locations, initialFilters }: ReviewsPageClientProps) {
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(initialFilters?.search || '')

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set())
  const [bulkDrafting, setBulkDrafting] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 })
  const [autoReplyLoading, setAutoReplyLoading] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)

  const { data: dashboardSnapshot } = useDashboardSnapshot()
  const reviewStatsSummary: ReviewStats | null = useMemo(() => {
    const reviewStats = dashboardSnapshot?.reviewStats
    if (!reviewStats) return null
    return {
      total: reviewStats.totals.total ?? 0,
      pending: reviewStats.totals.pending ?? 0,
      replied: reviewStats.totals.replied ?? 0,
      averageRating: reviewStats.averageRating ?? 0,
      responseRate: reviewStats.responseRate ?? 0,
      byRating: {
        5: reviewStats.byRating?.['5'] ?? 0,
        4: reviewStats.byRating?.['4'] ?? 0,
        3: reviewStats.byRating?.['3'] ?? 0,
        2: reviewStats.byRating?.['2'] ?? 0,
        1: reviewStats.byRating?.['1'] ?? 0,
      },
    }
  }, [dashboardSnapshot?.reviewStats])

  // Use infinite scroll by default
  const {
    reviews,
    loading,
    error,
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
  })

  // Infinite scroll trigger
  const { ref: infiniteScrollRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })

  // Load more when scroll trigger is in view
  useEffect(() => {
    if (inView && hasNextPage && !isLoadingMore && !loading) {
      loadMore()
    }
  }, [inView, hasNextPage, isLoadingMore, loading, loadMore])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        updateFilter('search', searchInput || undefined)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search, updateFilter])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleGlobalRefresh = () => {
      refresh()
    }

    window.addEventListener('dashboard:refresh', handleGlobalRefresh)
    window.addEventListener('gmb-sync-complete', handleGlobalRefresh)

    return () => {
      window.removeEventListener('dashboard:refresh', handleGlobalRefresh)
      window.removeEventListener('gmb-sync-complete', handleGlobalRefresh)
    }
  }, [refresh])

  // Handle reply
  const handleReply = (review: GMBReview) => {
    setSelectedReview(review)
    setReplyDialogOpen(true)
  }

  // Handle checkbox change
  const handleCheckChange = (reviewId: string, checked: boolean) => {
    setSelectedReviewIds((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(reviewId)
      } else {
        newSet.delete(reviewId)
      }
      return newSet
    })
  }

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedReviewIds(new Set())
    }
  }

  // Select all visible reviews
  const selectAll = () => {
    setSelectedReviewIds(new Set(reviews.map((r) => r.id)))
  }

  // Clear all selections
  const clearSelection = () => {
    setSelectedReviewIds(new Set())
  }

  // Get selected review objects
  const selectedReviews = useMemo(
    () => reviews.filter((r) => selectedReviewIds.has(r.id)),
    [reviews, selectedReviewIds],
  )

  const pendingReviews = useMemo(() => reviews.filter((review) => !review.has_reply), [reviews])

  const hasActiveFilters = Boolean(
    filters.locationId || filters.rating || filters.status || filters.sentiment || filters.search,
  )

  // Handle bulk action complete
  const handleBulkActionComplete = () => {
    clearSelection()
    refresh()
  }

  const handleAutoReplyControl = useCallback(
    async (action: 'pause' | 'resume' | 'reset') => {
      if (autoReplyLoading) {
        return false
      }

      setAutoReplyLoading(true)
      let success = false

      try {
        const response = await fetch('/api/reviews/auto-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            locationId: filters.locationId ?? null,
          }),
        })

        const body = await response.json().catch(() => ({}))

        if (!response.ok) {
          const description = body?.error || 'Failed to update auto-reply settings'
          toast.error('Auto-reply update failed', { description })
          return false
        }

        if (action === 'reset') {
          await refresh()
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai:auto-reply:refresh'))
        }

        toast.success(body?.message || 'Auto-reply settings updated')
        success = true
      } catch (error) {
        console.error('[Reviews] Auto-reply control error:', error)
        toast.error('Unable to update auto-reply settings right now')
      } finally {
        setAutoReplyLoading(false)
      }
      return success
    },
    [autoReplyLoading, filters.locationId, refresh],
  )

  const handleBulkDrafts = useCallback(async () => {
    if (bulkDrafting) return

    const targets = pendingReviews.length > 0 ? pendingReviews : selectedReviews
    if (targets.length === 0) {
      toast.info('No pending reviews available for AI drafting')
      return
    }

    setBulkDrafting(true)
    setBulkProgress({ completed: 0, total: targets.length })

    try {
      for (const review of targets) {
        try {
          const reviewText =
            (review.review_text ?? '').trim() ||
            'The customer left a rating without additional comments.'

          const response = await fetch('/api/reviews/ai-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reviewId: review.id,
              reviewText,
              rating: review.rating ?? 5,
              locationName: review.location_name,
            }),
          })

          if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            throw new Error(body?.error || 'Failed to generate reply')
          }

          setBulkProgress((prev) => ({
            ...prev,
            completed: prev.completed + 1,
          }))
        } catch (error) {
          console.error('[Reviews] AI draft error:', error)
          toast.error('Some replies failed to generate. Check console for details.')
        }
      }

      toast.success('AI drafts generated')
      refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dashboard:refresh'))
      }
    } catch (error) {
      console.error('[Reviews] Bulk AI draft failure:', error)
      toast.error('Failed to generate AI drafts')
    } finally {
      setBulkDrafting(false)
      setBulkProgress({ completed: 0, total: 0 })
    }
  }, [bulkDrafting, pendingReviews, selectedReviews, refresh])

  const bulkProgressPct = useMemo(() => {
    if (!bulkProgress.total) return 0
    return Math.round((bulkProgress.completed / bulkProgress.total) * 100)
  }, [bulkProgress])

  const reviewTrendPct = dashboardSnapshot?.kpis.reviewTrendPct ?? 0
  const autoReplySuccessRate = dashboardSnapshot?.automationStats?.successRatePct ?? null

  const handleExport = useCallback(() => {
    try {
      const params = new URLSearchParams({
        export: 'csv',
        pageSize: '5000',
      })

      if (filters.locationId) params.set('locationId', filters.locationId)
      if (filters.rating) params.set('rating', String(filters.rating))
      if (filters.status) params.set('status', filters.status)
      if (filters.sentiment) params.set('sentiment', filters.sentiment)
      if (filters.search) params.set('search', filters.search)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const url = `/api/reviews?${params.toString()}`
      window.open(url, '_blank', 'noopener')
    } catch (error) {
      console.error('[Reviews] Export error:', error)
      toast.error('Unable to export reviews right now')
    }
  }, [filters])

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      <ReviewsOverviewHeader
        stats={reviewStatsSummary}
        selectionMode={selectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        onSelectAll={selectAll}
        selectedCount={selectedReviewIds.size}
        totalVisible={reviews.length}
        onOpenAiSidebar={() => setAiSidebarOpen(true)}
        onOpenAISettings={() => setAiSettingsOpen(true)}
      />

      <ReviewsFilterBar
        locations={locations}
        filters={filters}
        updateFilter={updateFilter}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onClearFilters={() => {
          updateFilter('locationId', undefined)
          updateFilter('rating', undefined)
          updateFilter('status', undefined)
          updateFilter('sentiment', undefined)
          updateFilter('search', undefined)
          setSearchInput('')
        }}
        hasActiveFilters={hasActiveFilters}
        stats={reviewStatsSummary}
        onExport={handleExport}
      />

      <main className="flex-1 px-6 pb-8">
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <ReviewsFeedSection
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
            reviewStats={reviewStatsSummary}
            loadMore={loadMore}
          />
          <AutoReplySidebar
            reviewStats={reviewStatsSummary}
            pendingCount={reviewStatsSummary?.pending ?? pendingReviews.length}
            selectedCount={selectedReviewIds.size}
            bulkDrafting={bulkDrafting}
            bulkProgressPct={bulkProgressPct}
            autoReplyLoading={autoReplyLoading}
            onBulkDrafts={handleBulkDrafts}
            onPause={() => handleAutoReplyControl('pause')}
            onResume={() => handleAutoReplyControl('resume')}
            onCancel={() => handleAutoReplyControl('reset')}
            onOpenAssistant={() => setAiSidebarOpen(true)}
            locationId={filters.locationId}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AIAnalyticsCard
            totalResponses={reviewStatsSummary?.replied ?? 0}
            responseRate={reviewStatsSummary?.responseRate ?? 0}
            autoReplySuccessRate={autoReplySuccessRate}
            reviewTrendPct={reviewTrendPct}
            pendingCount={reviewStatsSummary?.pending ?? 0}
          />
          <AutoReplySettingsPanel locationId={filters.locationId} />
        </div>
      </main>

      <ReplyDialog
        review={selectedReview}
        isOpen={replyDialogOpen}
        onClose={() => {
          setReplyDialogOpen(false)
          setSelectedReview(null)
        }}
        onSuccess={() => {
          refresh()
        }}
      />

      <Sheet open={aiSidebarOpen} onOpenChange={setAiSidebarOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 p-0 overflow-y-auto"
        >
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

      <ReviewAISettings
        open={aiSettingsOpen}
        onOpenChange={setAiSettingsOpen}
        locationId={filters.locationId}
      />
    </div>
  )
}

interface ReviewsOverviewHeaderProps {
  stats: ReviewStats | null
  selectionMode: boolean
  onToggleSelectionMode: () => void
  onSelectAll: () => void
  selectedCount: number
  totalVisible: number
  onOpenAiSidebar: () => void
  onOpenAISettings?: () => void
}

function ReviewsOverviewHeader({
  stats,
  selectionMode,
  onToggleSelectionMode,
  onSelectAll,
  selectedCount,
  totalVisible,
  onOpenAiSidebar,
  onOpenAISettings,
}: ReviewsOverviewHeaderProps) {
  return (
    <section className="border-b border-zinc-800 px-6 py-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-orange-400 mb-1">AI Command Center</p>
          <h1 className="text-3xl font-semibold text-white">Reviews Management</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Monitor incoming feedback, orchestrate AI auto-replies, and keep response quality on
            track.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onToggleSelectionMode}
            variant={selectionMode ? 'default' : 'outline'}
            className={
              selectionMode
                ? 'bg-orange-500 hover:bg-orange-600 border-none'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            }
          >
            {selectionMode ? (
              <>
                <CheckSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                Exit Selection ({selectedCount})
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" aria-hidden="true" />
                Select Reviews
              </>
            )}
          </Button>
          {selectionMode && (
            <Button
              onClick={onSelectAll}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Select All ({totalVisible})
            </Button>
          )}
          <Button
            onClick={onOpenAiSidebar}
            variant="outline"
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <Bot className="w-4 h-4 mr-2" aria-hidden="true" />
            Open AI Copilot
          </Button>
          {onOpenAISettings && (
            <Button
              onClick={onOpenAISettings}
              variant="outline"
              className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
            >
              <Bot className="w-4 h-4 mr-2" aria-hidden="true" />
              إعدادات AI
            </Button>
          )}
          {/* Sync button removed - use global sync in header */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Star}
          label="Total Reviews"
          value={stats?.total ?? 0}
          accent="text-orange-400"
        />
        <MetricCard
          icon={Sparkles}
          label="Pending Reply"
          value={stats?.pending ?? 0}
          accent="text-yellow-400"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Avg Rating"
          value={stats?.averageRating ? stats.averageRating.toFixed(1) : '—'}
        />
        <MetricCard
          icon={Clock3}
          label="Response Rate"
          value={`${stats?.responseRate?.toFixed(1) ?? '0'}%`}
        />
      </div>
    </section>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <Card className="bg-zinc-900/60 border border-orange-500/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{label}</CardTitle>
        <Icon className="h-4 w-4 text-orange-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-semibold ${accent ?? 'text-white'}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

interface ReviewsFilterBarProps {
  locations: ReadonlyArray<{ id: string; location_name: string }>
  filters: ReviewsFilters
  updateFilter: UpdateFilterFn
  searchInput: string
  onSearchChange: (value: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  stats: ReviewStats | null
  onExport: () => void
}

function ReviewsFilterBar({
  locations,
  filters,
  updateFilter,
  searchInput,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
  stats,
  onExport,
}: ReviewsFilterBarProps) {
  const ratingCounts = stats?.byRating ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const ratingButtons: Array<{ value: number; label: string }> = [
    { value: 5, label: '⭐ 5' },
    { value: 4, label: '⭐ 4' },
    { value: 3, label: '⭐ 3' },
    { value: 2, label: '⭐ 2' },
    { value: 1, label: '⭐ 1' },
  ]

  const selectedStatus = filters.status ?? 'all'
  const selectedRating = filters.rating ?? null

  return (
    <section className="border-b border-zinc-800 px-6 py-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={selectedStatus === 'all'}
            onClick={() => updateFilter('status', undefined)}
            label="All"
          />
          <FilterChip
            active={selectedStatus === 'pending'}
            onClick={() => updateFilter('status', 'pending')}
            label="Pending"
            badge={stats?.pending ?? 0}
          />
          <FilterChip
            active={selectedStatus === 'replied'}
            onClick={() => updateFilter('status', 'replied')}
            label="Replied"
            badge={stats?.replied ?? 0}
          />
          <FilterChip
            active={selectedStatus === 'flagged'}
            onClick={() => updateFilter('status', 'flagged')}
            label="Flagged"
          />
        </div>
        <div className="flex items-center gap-2">
          {ratingButtons.map((ratingButton) => (
            <FilterChip
              key={ratingButton.value}
              active={selectedRating === ratingButton.value}
              onClick={() =>
                updateFilter(
                  'rating',
                  selectedRating === ratingButton.value ? undefined : ratingButton.value,
                )
              }
              label={ratingButton.label}
              badge={ratingCounts[ratingButton.value] ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={filters.locationId || ''}
            onChange={(e) => updateFilter('locationId', e.target.value || undefined)}
            className="w-full sm:w-56 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          <select
            value={filters.sentiment || ''}
            onChange={(e) => updateFilter('sentiment', e.target.value || undefined)}
            className="w-full sm:w-48 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 sm:flex-none">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search reviews, keywords, or people…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-orange-500"
            />
          </div>

          <Button
            onClick={onExport}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export CSV
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={onClearFilters}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

interface ReviewsFeedSectionProps {
  reviews: ReadonlyArray<GMBReview>
  loading: boolean
  error: string | null
  filters: ReviewsFilters
  selectionMode: boolean
  selectedReview: GMBReview | null
  selectedReviewIds: ReadonlySet<string>
  onSelectReview: (review: GMBReview) => void
  onReply: (review: GMBReview) => void
  onCheckChange: (reviewId: string, checked: boolean) => void
  hasNextPage: boolean
  infiniteScrollRef: (node?: Element | null) => void
  isLoadingMore: boolean
  reviewStats: ReviewStats | null
  loadMore: () => Promise<void>
}

function ReviewsFeedSection({
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
  reviewStats,
  loadMore,
}: ReviewsFeedSectionProps) {
  const hasReviews = reviews.length > 0

  return (
    <section className="min-h-[32rem] rounded-2xl border border-zinc-800 bg-zinc-950/60">
      <header className="flex flex-col gap-2 border-b border-zinc-900 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Reviews Feed</h2>
          <p className="text-sm text-zinc-500">
            {reviewStats?.pending ?? 0} awaiting response · {reviewStats?.replied ?? 0} completed
            this month
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ArrowUpRight className="h-3.5 w-3.5 text-orange-400" />
          {t('realtimeSyncEnabled')}
        </div>
      </header>

      <div className="max-h-[calc(100vh-320px)] overflow-y-auto px-6 py-6">
        {error && <ErrorBanner message={error} />}

        {loading && !hasReviews && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" aria-hidden="true" />
          </div>
        )}

        {!loading && !hasReviews && <EmptyState filters={filters} />}

        {hasReviews && (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClick={() => {
                  if (!selectionMode) {
                    onSelectReview(review)
                  }
                }}
                isSelected={selectedReview?.id === review.id}
                onReply={() => onReply(review)}
                showCheckbox={selectionMode}
                isChecked={selectedReviewIds.has(review.id)}
                onCheckChange={(checked) => onCheckChange(review.id, checked)}
              />
            ))}

            {hasNextPage && (
              <div ref={infiniteScrollRef} className="flex justify-center py-6">
                {isLoadingMore ? (
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" aria-hidden="true" />
                ) : (
                  <Button
                    onClick={() => loadMore()}
                    variant="ghost"
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    {t('loadMore')}
                  </Button>
                )}
              </div>
            )}

            {!hasNextPage && (
              <div className="text-center py-6">
                <p className="text-zinc-500 text-sm">{t('allCaughtUp')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
      <p className="text-red-400">{message}</p>
    </div>
  )
}

function EmptyState({ filters }: { filters: ReviewsFilters }) {
  return (
    <Card className="bg-zinc-900/60 border border-zinc-800">
      <CardContent className="text-center py-12">
        <p className="text-zinc-400 text-lg font-medium mb-2">No reviews found</p>
        <p className="text-zinc-500 text-sm">
          {filters.locationId
            ? 'Try syncing reviews or adjusting filters'
            : 'Select a location to view reviews'}
        </p>
      </CardContent>
    </Card>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  badge,
}: {
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition ${
        active
          ? 'bg-orange-500 text-white shadow-orange-500/30 shadow-sm'
          : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span className={`text-xs ${active ? 'text-white/80' : 'text-zinc-500'}`}>{badge}</span>
      )}
    </button>
  )
}

interface AutoReplySidebarProps {
  reviewStats: ReviewStats | null
  pendingCount: number
  selectedCount: number
  bulkDrafting: boolean
  bulkProgressPct: number
  autoReplyLoading: boolean
  onBulkDrafts: () => void
  onPause: () => Promise<boolean>
  onResume: () => Promise<boolean>
  onCancel: () => Promise<boolean>
  onOpenAssistant: () => void
  locationId?: string
}

function AutoReplySidebar({
  reviewStats,
  pendingCount,
  selectedCount,
  bulkDrafting,
  bulkProgressPct,
  autoReplyLoading,
  onBulkDrafts,
  onPause,
  onResume,
  onCancel,
  onOpenAssistant,
  locationId,
}: AutoReplySidebarProps) {
  const pendingTotal = pendingCount || 0
  const selectedDisplay = selectedCount > 0 ? selectedCount : pendingTotal
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
  const [autoReplyFetching, setAutoReplyFetching] = useState(false)

  const fetchAutoReplyState = useCallback(async () => {
    setAutoReplyFetching(true)
    try {
      const params = new URLSearchParams()
      if (locationId) {
        params.set('locationId', locationId)
      }
      const query = params.toString()
      const response = await fetch(`/api/reviews/auto-reply${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json().catch(() => null)
        setAutoReplyEnabled(Boolean(data?.settings?.enabled))
      }
    } catch (error) {
      console.error('[Reviews] Failed to load auto-reply state', error)
    } finally {
      setAutoReplyFetching(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchAutoReplyState()
  }, [fetchAutoReplyState])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handler = () => {
      fetchAutoReplyState()
    }
    window.addEventListener('ai:auto-reply:refresh', handler)
    return () => {
      window.removeEventListener('ai:auto-reply:refresh', handler)
    }
  }, [fetchAutoReplyState])

  const autoReplyBusy = autoReplyLoading || autoReplyFetching

  const handlePrimaryAction = useCallback(async () => {
    if (autoReplyBusy) {
      return
    }
    const outcome = autoReplyEnabled ? await onPause() : await onResume()
    if (outcome) {
      await fetchAutoReplyState()
    }
  }, [autoReplyBusy, autoReplyEnabled, onPause, onResume, fetchAutoReplyState])

  const handleCancelAutomation = useCallback(async () => {
    if (autoReplyBusy) {
      return
    }
    const outcome = await onCancel()
    if (outcome) {
      await fetchAutoReplyState()
    }
  }, [autoReplyBusy, onCancel, fetchAutoReplyState])

  const statusLabel = autoReplyFetching ? 'Syncing…' : autoReplyEnabled ? 'Active Mode' : 'Standby'
  const statusBadgeClass = autoReplyEnabled
    ? 'bg-green-500/15 text-green-300'
    : 'bg-zinc-800 text-zinc-400'

  return (
    <section className="space-y-4">
      <Card className="border border-orange-500/20 bg-zinc-900/60">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-400" aria-hidden="true" />
              AI Auto-Reply Engine
            </CardTitle>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadgeClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Automate gratitude, escalate issues, and keep consistency across every response.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
            <PreferenceRow
              label="⭐ 5"
              description="Auto-send immediately with warm thank you."
              active
            />
            <PreferenceRow label="⭐ 4" description="Auto-draft + needs quick glance." active />
            <PreferenceRow
              label="⭐ 3"
              description="Manual review with AI draft suggestion."
              active
            />
            <PreferenceRow label="⭐ 2" description="Escalate with urgency, AI draft ready." />
            <PreferenceRow label="⭐ 1" description="Alert team + manual response required." />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Bulk actions</p>
              <span className="text-xs text-zinc-500">
                {selectedDisplay} {selectedDisplay === 1 ? 'review' : 'reviews'} queued
              </span>
            </div>
            <Button
              onClick={onBulkDrafts}
              disabled={bulkDrafting || autoReplyBusy}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {bulkDrafting ? 'Generating AI drafts…' : `Generate AI Drafts (${selectedDisplay})`}
            </Button>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${bulkProgressPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {bulkDrafting ? `${bulkProgressPct}% complete` : 'Ready for next batch'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrimaryAction}
                variant="outline"
                disabled={autoReplyBusy}
                className="flex-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
              >
                <Pause className="w-4 h-4 mr-2" />
                {autoReplyEnabled ? 'Pause Auto-Reply' : 'Resume Auto-Reply'}
              </Button>
              <Button
                onClick={handleCancelAutomation}
                variant="outline"
                disabled={autoReplyBusy}
                className="flex-1 border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-white">AI Performance</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-orange-300 hover:text-orange-200 hover:bg-orange-500/10"
            onClick={onOpenAssistant}
          >
            View insights
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-300">
          <PerformanceMetric label="Today" value={`${reviewStats?.replied ?? 0} auto-replies`} />
          <PerformanceMetric label="Accuracy" value="94%" />
          <PerformanceMetric label="Edited" value="2 / 15 drafts" />
          <PerformanceMetric label="Customer happiness" value="↑ 12%" trending="up" />
        </CardContent>
      </Card>

      <Card className="border border-zinc-800 bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Reply Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-300">
          <TemplateItem title="Thankful (Positive)" />
          <TemplateItem title="Apologetic (Negative)" />
          <TemplateItem title="Professional (Neutral)" />
          <Button
            variant="ghost"
            className="w-full justify-start px-0 text-orange-300 hover:text-orange-200 hover:bg-orange-500/10"
            onClick={() => toast.info('Template builder coming soon')}
          >
            + Add custom template
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function PreferenceRow({
  label,
  description,
  active,
}: {
  label: string
  description: string
  active?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-zinc-900/40 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        {active && <span className="text-[10px] uppercase tracking-wide text-green-400">Auto</span>}
      </div>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  )
}

function PerformanceMetric({
  label,
  value,
  trending,
}: {
  label: string
  value: string
  trending?: 'up' | 'down'
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-white">
        {value}{' '}
        {trending ? (
          <span className={trending === 'up' ? 'text-green-400' : 'text-red-400'}>
            {trending === 'up' ? '↑' : '↓'}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function TemplateItem({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <span className="text-sm text-white">{title}</span>
    </div>
  )
}

function AIAnalyticsCard({
  totalResponses,
  responseRate,
  reviewTrendPct,
  pendingCount,
  autoReplySuccessRate,
}: {
  totalResponses: number
  responseRate: number
  reviewTrendPct: number
  pendingCount: number
  autoReplySuccessRate: number | null
}) {
  const trendDirection: 'up' | 'down' | null =
    Number.isFinite(reviewTrendPct) && reviewTrendPct !== 0
      ? reviewTrendPct > 0
        ? 'up'
        : 'down'
      : null
  const trendValue = `${reviewTrendPct > 0 ? '+' : reviewTrendPct < 0 ? '-' : ''}${Math.abs(
    Math.round(reviewTrendPct),
  )}% vs last month`
  const automationSuccess =
    autoReplySuccessRate !== null && Number.isFinite(autoReplySuccessRate)
      ? `${autoReplySuccessRate.toFixed(1)}%`
      : '—'

  return (
    <Card className="border border-zinc-800 bg-zinc-900/40">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-400" aria-hidden="true" />
          AI Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-300">
        <AnalyticsRow label="Pending reviews" value={`${pendingCount}`} />
        <AnalyticsRow label="Response rate" value={`${responseRate.toFixed(1)}%`} />
        <AnalyticsRow label="Review trend" value={trendValue} trend={trendDirection ?? undefined} />
        <AnalyticsRow
          label="Auto-reply success"
          value={automationSuccess}
          trend={
            autoReplySuccessRate !== null && autoReplySuccessRate >= 70
              ? 'up'
              : autoReplySuccessRate !== null && autoReplySuccessRate < 40
                ? 'down'
                : undefined
          }
        />
        <AnalyticsRow label="Total replies (30d)" value={`${totalResponses}`} />
      </CardContent>
    </Card>
  )
}

function AutoReplySettingsCard() {
  const router = useRouter()

  const handleConfigureRules = () => {
    router.push('/settings?tab=ai')
  }

  const handleTemplates = () => {
    router.push('/settings?tab=ai&section=templates')
  }

  const handleTrainingHistory = () => {
    router.push('/automation')
  }

  const handleExportLogs = () => {
    router.push('/automation?view=logs')
  }

  return (
    <Card className="border border-zinc-800 bg-zinc-900/40">
      <CardHeader>
        <CardTitle className="text-lg text-white">Auto-Reply Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <SettingsButton label="Configure Rules" onClick={handleConfigureRules} />
        <SettingsButton label="Templates" onClick={handleTemplates} />
        <SettingsButton label="Training History" onClick={handleTrainingHistory} />
        <SettingsButton label="Export Logs" onClick={handleExportLogs} />
      </CardContent>
    </Card>
  )
}

function AnalyticsRow({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: 'up' | 'down'
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-white flex items-center gap-1">
        {value}
        {trend ? (
          <span className={trend === 'up' ? 'text-green-400' : 'text-red-400'}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function SettingsButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className="justify-start border-zinc-700 text-zinc-200 hover:bg-zinc-800"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
