'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  topics: Array<{ topic: string; count: number }>;
}

export interface UseSentimentAnalysisResult {
  data: SentimentData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSentimentAnalysis(): UseSentimentAnalysisResult {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSentiment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/reviews/sentiment');
      
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching sentiment:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSentiment();

    // Auto-refetch on window focus
    const handleFocus = () => {
      fetchSentiment();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSentiment]);

  return {
    data,
    loading,
    error,
    refetch: fetchSentiment,
  };
}

