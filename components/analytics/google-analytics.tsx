'use client';

import { useEffect } from 'react';
import { getNonce } from '@/lib/security/csp-nonce';

interface GoogleAnalyticsProps {
  measurementId?: string;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const GA_MEASUREMENT_ID = measurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      console.warn('[GoogleAnalytics] No measurement ID provided');
      return;
    }

    // Load Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    }

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });

    // Add gtag to window for global access
    (window as any).gtag = gtag;

    return () => {
      // Cleanup on unmount
      const scripts = document.querySelectorAll(`script[src*="googletagmanager.com"]`);
      scripts.forEach(script => script.remove());
    };
  }, [GA_MEASUREMENT_ID]);

  return null;
}

// Helper function to track events
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, parameters);
  }
}

// Helper function to track page views
export function trackPageView(url: string, title?: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_title: title || document.title,
      page_location: url,
    });
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}
