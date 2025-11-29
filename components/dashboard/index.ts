/**
 * @deprecated BARREL FILE - Avoid importing from this file!
 *
 * For better tree-shaking and smaller bundle sizes, import directly:
 *
 * ❌ import { DashboardSkeleton } from '@/components/dashboard'
 * ✅ import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
 *
 * For heavy components, use lazy loading:
 * ✅ import { LazyMonitoringDashboard } from '@/lib/lazy-components'
 */

// Loading States - lightweight, OK to re-export
export { DashboardSkeleton } from "./dashboard-skeleton";

// Lightweight components only
export { default as ActivityFeedItem } from "./ActivityFeedItem";
export { default as BusinessHeader } from "./BusinessHeader";
export { default as QuickActionButton } from "./QuickActionButton";

// AI components - consider using lazy loading for heavy ones
export { default as AIInsightsCards } from "./ai/AIInsightsCards";
export { default as AutoReplyMonitoring } from "./ai/AutoReplyMonitoring";
export { default as AutopilotStatus } from "./ai/AutopilotStatus";
export { default as MiniChat } from "./ai/MiniChat";
export { default as PerformancePredictor } from "./ai/PerformancePredictor";
