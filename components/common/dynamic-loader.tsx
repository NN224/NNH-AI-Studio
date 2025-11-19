'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { useEffect } from 'react';
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
export function createDynamicComponent<P = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => JSX.Element;
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
  StatsCards: createDynamicComponent(
    () => import('@/components/dashboard/stats-cards')
  ),
  
  PerformanceComparisonChart: createDynamicComponent(
    () => import('@/components/dashboard/performance-comparison-chart'),
    { ssr: false } // Charts don't need SSR
  ),
  
  // Note: Other components commented out to avoid import errors
  // Add them back when the components exist with proper default exports
};

/**
 * Hook to preload dynamic components
 */
export function usePreloadComponents(components: Array<keyof typeof DynamicComponents>) {
  // Preload components on mount or when idle
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = requestIdleCallback(() => {
        components.forEach((componentName) => {
          const component = DynamicComponents[componentName];
          if (component && 'preload' in component) {
            (component as any).preload();
          }
        });
      });
      
      return () => {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          cancelIdleCallback(handle);
        }
      };
    }
  }, [components]);
}
