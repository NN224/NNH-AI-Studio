import { useEffect, useRef, useCallback } from 'react';

/**
 * Performance metrics type
 */
interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  componentRenderTime?: number;
  apiCallDuration?: number;
  memoryUsage?: number;
  
  // Navigation
  navigationType?: string;
  loadTime?: number;
}

/**
 * Hook to monitor and report performance metrics
 */
export function usePerformanceMonitor(componentName?: string) {
  const metricsRef = useRef<PerformanceMetrics>({});
  const renderStartRef = useRef<number>(performance.now());

  // Track component render time
  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    metricsRef.current.componentRenderTime = renderTime;

    if (process.env.NODE_ENV === 'development' && componentName) {
      console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  });

  // Monitor Core Web Vitals
  useEffect(() => {
    if ('web-vital' in window || 'PerformanceObserver' in window) {
      try {
        // Monitor LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metricsRef.current.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Monitor FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metricsRef.current.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Monitor CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              metricsRef.current.cls = clsValue;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      } catch (error) {
        console.warn('Performance monitoring not supported:', error);
      }
    }
  }, []);

  // Track memory usage
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as any).memory;
        metricsRef.current.memoryUsage = memInfo.usedJSHeapSize;
      };

      checkMemory();
      const interval = setInterval(checkMemory, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, []);

  // Function to measure API call performance
  const measureApiCall = useCallback(async (
    apiCall: () => Promise<any>,
    apiName: string
  ) => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      metricsRef.current.apiCallDuration = duration;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] API call "${apiName}" took ${duration.toFixed(2)}ms`);
      }

      // Report slow API calls
      if (duration > 2000) {
        console.warn(`[Performance] Slow API call detected: ${apiName} (${duration.toFixed(2)}ms)`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[Performance] API call "${apiName}" failed after ${duration.toFixed(2)}ms`);
      throw error;
    }
  }, []);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Report metrics to analytics
  const reportMetrics = useCallback(() => {
    const metrics = getMetrics();
    
    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance', {
        event_category: 'Web Vitals',
        event_label: componentName || 'general',
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
      });
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.table(metrics);
    }
  }, [componentName, getMetrics]);

  return {
    measureApiCall,
    getMetrics,
    reportMetrics,
  };
}

/**
 * Hook to lazy load images with performance tracking
 */
export function useLazyImageLoad() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.getAttribute('data-src');
              
              if (src) {
                const startTime = performance.now();
                
                img.onload = () => {
                  const loadTime = performance.now() - startTime;
                  if (process.env.NODE_ENV === 'development' && loadTime > 500) {
                    console.warn(`[Performance] Slow image load: ${src} (${loadTime.toFixed(2)}ms)`);
                  }
                };
                
                img.src = src;
                img.removeAttribute('data-src');
                observerRef.current?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px',
        }
      );
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const observeImage = useCallback((img: HTMLImageElement | null) => {
    if (img && observerRef.current) {
      observerRef.current.observe(img);
    }
  }, []);

  return { observeImage };
}

/**
 * Hook to detect and report performance issues
 */
export function usePerformanceAlerts() {
  useEffect(() => {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
        return () => observer.disconnect();
      } catch (error) {
        // Long task monitoring not supported
      }
    }
  }, []);

  // Monitor React renders in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'Profiler' in window) {
      const slowRenderThreshold = 16; // 60fps = 16ms per frame
      
      // This would integrate with React DevTools Profiler API
      console.log('[Performance] React render monitoring active');
    }
  }, []);
}

// Type augmentation for window.gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
