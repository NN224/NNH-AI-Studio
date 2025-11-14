'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading component shown while dynamic imports are loading
 */
export function ComponentLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Error component shown when dynamic imports fail
 */
export function ComponentError({ error }: { error?: Error }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8 text-center">
      <div>
        <p className="text-sm text-muted-foreground">Failed to load component</p>
        {process.env.NODE_ENV === 'development' && error && (
          <p className="text-xs text-red-500 mt-2">{error.message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Helper to create dynamic imports with consistent loading/error states
 */
export function createDynamicComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || ComponentLoader,
    ssr: options?.ssr ?? true,
  });
}

// Pre-configured dynamic imports for heavy components
export const DynamicComponents = {
  // Dashboard components
  DashboardTabs: createDynamicComponent(
    () => import('@/components/dashboard/dashboard-tabs')
  ),
  
  StatsCards: createDynamicComponent(
    () => import('@/components/dashboard/stats-cards')
  ),
  
  PerformanceChart: createDynamicComponent(
    () => import('@/components/dashboard/performance-chart'),
    { ssr: false } // Charts don't need SSR
  ),
  
  // Locations components
  LocationsMapTab: createDynamicComponent(
    () => import('@/components/locations/locations-map-tab-new'),
    { ssr: false } // Map doesn't need SSR
  ),
  
  LocationsListView: createDynamicComponent(
    () => import('@/components/locations/locations-list-view')
  ),
  
  LocationDetailDialog: createDynamicComponent(
    () => import('@/components/locations/location-detail-dialog')
  ),
  
  // Reviews components
  ReviewsList: createDynamicComponent(
    () => import('@/components/reviews/reviews-list')
  ),
  
  ReviewResponseCockpit: createDynamicComponent(
    () => import('@/components/reviews/ReviewResponseCockpit')
  ),
  
  ReviewsFeed: createDynamicComponent(
    () => import('@/components/reviews/reviews-feed')
  ),
  
  // Questions components
  QuestionsList: createDynamicComponent(
    () => import('@/components/questions/questions-list')
  ),
  
  AnswerDialog: createDynamicComponent(
    () => import('@/components/questions/answer-dialog')
  ),
  
  // Settings components
  SettingsTabs: createDynamicComponent(
    () => import('@/components/settings/settings-tabs')
  ),
  
  BrandingTab: createDynamicComponent(
    () => import('@/components/settings/branding-tab')
  ),
  
  SecurityReviewPanel: createDynamicComponent(
    () => import('@/components/settings/security-review-panel')
  ),
  
  // AI components
  AIAssistantSidebar: createDynamicComponent(
    () => import('@/components/reviews/ai-assistant-sidebar')
  ),
  
  // Analytics components
  MetricsPanel: createDynamicComponent(
    () => import('@/components/analytics/metrics-panel'),
    { ssr: false }
  ),
  
  InsightsSidebar: createDynamicComponent(
    () => import('@/components/insights/insights-sidebar')
  ),
  
  // Media components
  MediaGallery: createDynamicComponent(
    () => import('@/components/media/media-gallery')
  ),
  
  // Posts components
  PostsList: createDynamicComponent(
    () => import('@/components/posts/posts-list')
  ),
  
  CreatePostDialog: createDynamicComponent(
    () => import('@/components/posts/create-post-dialog')
  ),
  
  // Attributes components
  LocationAttributesDialog: createDynamicComponent(
    () => import('@/components/locations/location-attributes-dialog')
  ),
};

/**
 * Hook to preload dynamic components
 */
export function usePreloadComponents(components: Array<keyof typeof DynamicComponents>) {
  // Preload components on mount or when idle
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(() => {
        components.forEach((componentName) => {
          const component = DynamicComponents[componentName];
          if (component && 'preload' in component) {
            (component as any).preload();
          }
        });
      });
      
      return () => {
        if ('cancelIdleCallback' in window) {
          cancelIdleCallback(handle);
        }
      };
    }
  }, [components]);
}

// Add missing import
import { useEffect } from 'react';
