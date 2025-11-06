'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface GenerateResponseParams {
  reviewId: string;
  reviewText: string;
  rating: number;
  locationName?: string;
}

export interface UseAIResponseGeneratorResult {
  generate: (params: GenerateResponseParams) => Promise<string | null>;
  loading: boolean;
  error: Error | null;
}

export function useAIResponseGenerator(): UseAIResponseGeneratorResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const generate = useCallback(async (params: GenerateResponseParams): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/reviews/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate AI response');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'AI response generated successfully',
      });

      return result.response || null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });

      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    generate,
    loading,
    error,
  };
}

