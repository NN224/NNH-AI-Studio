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

// AI components removed - files don't exist
// If needed, import directly from @/components/ai/ or @/components/gmb/command-center/
