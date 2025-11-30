"use client";

/**
 * ============================================================================
 * Lazy Loading Configuration for Heavy Components
 * ============================================================================
 *
 * This module provides lazy-loaded versions of heavy components to improve
 * initial page load performance. Components are loaded on-demand.
 *
 * Usage:
 * ```tsx
 * import { LazyLocationsMap } from '@/lib/lazy-components';
 * <LazyLocationsMap locations={locations} />
 * ```
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// ============================================================================
// Loading Fallbacks
// ============================================================================

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function MapSkeleton() {
  return (
    <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
      <Skeleton className="h-full w-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[120px] mb-2" />
            <Skeleton className="h-3 w-[80px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Heavy Dashboard Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded stats cards - 6.5KB */
export const LazyStatsCards = dynamic(
  () => import("@/components/dashboard/stats-cards"),
  {
    loading: StatsGridSkeleton,
    ssr: false,
  },
);

/** Lazy-loaded performance chart - 11KB */
export const LazyPerformanceChart = dynamic(
  () =>
    import("@/components/dashboard/performance-comparison-chart").then(
      (mod) => ({
        default: mod.PerformanceComparisonChart,
      }),
    ),
  { loading: ChartSkeleton, ssr: false },
);

/** Lazy-loaded monitoring dashboard - 15KB */
export const LazyMonitoringDashboard = dynamic(
  () =>
    import("@/components/dashboard/monitoring-dashboard").then((mod) => ({
      default: mod.MonitoringDashboard,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded weekly tasks widget - 15KB */
export const LazyWeeklyTasksWidget = dynamic(
  () =>
    import("@/components/dashboard/weekly-tasks-widget").then((mod) => ({
      default: mod.WeeklyTasksWidget,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded advanced filters - 15KB */
export const LazyAdvancedFilters = dynamic(
  () =>
    import("@/components/dashboard/advanced-filters").then((mod) => ({
      default: mod.AdvancedFilters,
    })),
  { loading: () => <Skeleton className="h-12 w-full" />, ssr: false },
);

// ============================================================================
// Heavy Location Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded locations map - 79KB (HEAVIEST) */
export const LazyLocationsMap = dynamic(
  () =>
    import("@/components/locations/locations-map-tab").then((mod) => ({
      default: mod.LocationsMapTab,
    })),
  { loading: MapSkeleton, ssr: false },
);

/** Lazy-loaded location attributes dialog - 50KB */
export const LazyLocationAttributesDialog = dynamic(
  () =>
    import("@/components/locations/location-attributes-dialog").then((mod) => ({
      default: mod.LocationAttributesDialog,
    })),
  { loading: ModalSkeleton, ssr: false },
);

/** Lazy-loaded edit location dialog - 37KB */
export const LazyEditLocationDialog = dynamic(
  () =>
    import("@/components/locations/edit-location-dialog").then((mod) => ({
      default: mod.EditLocationDialog,
    })),
  { loading: ModalSkeleton, ssr: false },
);

/** Lazy-loaded business info editor - 31KB */
export const LazyBusinessInfoEditor = dynamic(
  () =>
    import("@/components/locations/business-info-editor").then((mod) => ({
      default: mod.BusinessInfoEditor,
    })),
  { loading: ModalSkeleton, ssr: false },
);

// ============================================================================
// Heavy Home Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded achievement system - 33KB */
export const LazyAchievementSystem = dynamic(
  () =>
    import("@/components/home/achievement-system").then((mod) => ({
      default: mod.AchievementSystem,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded progress tracker - 26KB */
export const LazyProgressTracker = dynamic(
  () =>
    import("@/components/home/progress-tracker").then((mod) => ({
      default: mod.ProgressTracker,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded AI insights charts - 17KB */
export const LazyAIInsightsCharts = dynamic(
  () =>
    import("@/components/home/ai-insights-charts").then((mod) => ({
      default: mod.AIInsightBarChart,
    })),
  { loading: ChartSkeleton, ssr: false },
);

/** Lazy-loaded smart notifications - 20KB */
export const LazySmartNotifications = dynamic(
  () =>
    import("@/components/home/smart-notifications").then((mod) => ({
      default: mod.SmartNotifications,
    })),
  { loading: CardSkeleton, ssr: false },
);

// ============================================================================
// Heavy AI Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded AI assistant - 24KB */
export const LazyAIAssistant = dynamic(
  () =>
    import("@/components/ai/ai-assistant").then((mod) => ({
      default: mod.AIAssistant,
    })),
  {
    loading: () => (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    ssr: false,
  },
);

/** Lazy-loaded AI hero chat - 17KB */
export const LazyAIHeroChat = dynamic(
  () =>
    import("@/components/ai-command-center/ai/ai-hero-chat").then((mod) => ({
      default: mod.AIHeroChat,
    })),
  {
    loading: () => (
      <Card className="h-[400px]">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  },
);

// ============================================================================
// Heavy Reviews/Questions Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded reviews page client - 44KB */
export const LazyReviewsPageClient = dynamic(
  () =>
    import("@/components/reviews/ReviewsPageClient").then((mod) => ({
      default: mod.ReviewsPageClient,
    })),
  { loading: ListSkeleton, ssr: false },
);

/** Lazy-loaded questions client page - 44KB */
export const LazyQuestionsClientPage = dynamic(
  () =>
    import("@/components/questions/QuestionsClientPage").then((mod) => ({
      default: mod.QuestionsClientPage,
    })),
  { loading: ListSkeleton, ssr: false },
);

// ============================================================================
// Heavy Settings Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded security review panel - 23KB */
export const LazySecurityReviewPanel = dynamic(
  () =>
    import("@/components/settings/security-review-panel").then((mod) => ({
      default: mod.SecurityReviewPanel,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded notifications tab - 16KB */
export const LazyNotificationsTab = dynamic(
  () =>
    import("@/components/settings/notifications-tab").then((mod) => ({
      default: mod.NotificationsTab,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded branding tab - 16KB */
export const LazyBrandingTab = dynamic(
  () =>
    import("@/components/settings/branding-tab").then((mod) => ({
      default: mod.BrandingTab,
    })),
  { loading: CardSkeleton, ssr: false },
);

// ============================================================================
// Heavy Analytics Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded custom report builder - 15KB */
export const LazyCustomReportBuilder = dynamic(
  () =>
    import("@/components/analytics/custom-report-builder").then((mod) => ({
      default: mod.CustomReportBuilder,
    })),
  { loading: CardSkeleton, ssr: false },
);

/** Lazy-loaded business insights - 21KB */
export const LazyBusinessInsights = dynamic(
  () =>
    import("@/components/insights/business-insights").then((mod) => ({
      default: mod.BusinessInsights,
    })),
  { loading: ChartSkeleton, ssr: false },
);

/** Lazy-loaded business recommendations - 22KB */
export const LazyBusinessRecommendations = dynamic(
  () =>
    import("@/components/recommendations/business-recommendations").then(
      (mod) => ({
        default: mod.BusinessRecommendations,
      }),
    ),
  { loading: CardSkeleton, ssr: false },
);

// ============================================================================
// Heavy Posts Components (Lazy Loaded)
// ============================================================================

/** Lazy-loaded create post dialog - 19KB */
export const LazyCreatePostDialog = dynamic(
  () =>
    import("@/components/posts/create-post-dialog").then((mod) => ({
      default: mod.CreatePostDialog,
    })),
  { loading: ModalSkeleton, ssr: false },
);

/** Lazy-loaded products manager - 16KB */
export const LazyProductsManager = dynamic(
  () =>
    import("@/components/products/products-manager").then((mod) => ({
      default: mod.ProductsManager,
    })),
  { loading: CardSkeleton, ssr: false },
);
