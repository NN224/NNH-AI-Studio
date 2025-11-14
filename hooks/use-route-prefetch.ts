import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Routes that should be prefetched based on user behavior
 */
const ROUTE_PRIORITIES = {
  // High priority - prefetch immediately
  high: [
    '/dashboard',
    '/locations',
    '/reviews',
  ],
  
  // Medium priority - prefetch on idle
  medium: [
    '/questions',
    '/profile',
    '/posts',
  ],
  
  // Low priority - prefetch on hover/interaction
  low: [
    '/settings',
    '/analytics',
    '/insights',
  ],
};

/**
 * Hook to manage route prefetching for better performance
 */
export function useRoutePrefetch() {
  const router = useRouter();
  
  // Prefetch high priority routes on mount
  useEffect(() => {
    ROUTE_PRIORITIES.high.forEach(route => {
      router.prefetch(route);
    });
  }, [router]);
  
  // Prefetch medium priority routes when idle
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(() => {
        ROUTE_PRIORITIES.medium.forEach(route => {
          router.prefetch(route);
        });
      });
      
      return () => {
        if ('cancelIdleCallback' in window) {
          cancelIdleCallback(handle);
        }
      };
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeout = setTimeout(() => {
        ROUTE_PRIORITIES.medium.forEach(route => {
          router.prefetch(route);
        });
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [router]);
  
  // Function to prefetch a specific route
  const prefetchRoute = useCallback((route: string) => {
    router.prefetch(route);
  }, [router]);
  
  // Function to prefetch on hover (for nav links)
  const prefetchOnHover = useCallback((route: string) => {
    return {
      onMouseEnter: () => prefetchRoute(route),
      onFocus: () => prefetchRoute(route),
    };
  }, [prefetchRoute]);
  
  return {
    prefetchRoute,
    prefetchOnHover,
  };
}

/**
 * Hook to prefetch data for a route before navigation
 */
export function useDataPrefetch() {
  const prefetchData = useCallback(async (endpoint: string) => {
    try {
      // Use the browser's built-in prefetch
      if ('link' in document.createElement('link')) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = endpoint;
        link.as = 'fetch';
        document.head.appendChild(link);
      }
    } catch (error) {
      console.warn('Data prefetch failed:', error);
    }
  }, []);
  
  const prefetchMultiple = useCallback(async (endpoints: string[]) => {
    endpoints.forEach(endpoint => prefetchData(endpoint));
  }, [prefetchData]);
  
  return {
    prefetchData,
    prefetchMultiple,
  };
}

/**
 * Hook to predict and prefetch next likely navigation
 */
export function usePredictiveNavigation() {
  const { prefetchRoute } = useRoutePrefetch();
  
  // Map current route to likely next routes
  const predictions: Record<string, string[]> = {
    '/dashboard': ['/locations', '/reviews'],
    '/locations': ['/reviews', '/profile'],
    '/reviews': ['/questions', '/locations'],
    '/questions': ['/reviews'],
    '/profile': ['/locations', '/settings'],
  };
  
  const predictAndPrefetch = useCallback((currentPath: string) => {
    const likelyNext = predictions[currentPath] || [];
    
    // Use intersection observer for viewport-based prefetching
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const route = entry.target.getAttribute('data-prefetch-route');
              if (route) {
                prefetchRoute(route);
              }
            }
          });
        },
        { rootMargin: '50px' }
      );
      
      // Observe navigation links
      likelyNext.forEach(route => {
        const elements = document.querySelectorAll(`[href="${route}"]`);
        elements.forEach(el => {
          el.setAttribute('data-prefetch-route', route);
          observer.observe(el);
        });
      });
      
      return () => observer.disconnect();
    }
  }, [prefetchRoute, predictions]);
  
  return { predictAndPrefetch };
}

