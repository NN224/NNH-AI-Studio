import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiLogger } from "@/lib/utils/logger";

/**
 * Hook for making fetch requests with automatic cancellation on unmount
 */
export function useSafeFetch() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const safeFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        return response;
      } catch (error) {
        // Re-throw if it's not an abort error
        if (error instanceof Error && error.name !== "AbortError") {
          throw error;
        }
        // Return a failed response for abort errors
        throw new Error("Request was cancelled");
      }
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cancelRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { safeFetch, cancelRequests };
}

/**
 * Hook for managing async operations with cleanup
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps?: React.DependencyList,
) {
  useEffect(() => {
    const controller = new AbortController();

    effect(controller.signal).catch((error) => {
      // Only log non-abort errors
      if (error.name !== "AbortError") {
        apiLogger.error(
          "Async effect error",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });

    return () => {
      controller.abort();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook to track if component is mounted
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook to safely set state only if component is mounted
 */
export function useSafeState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState(initialState);
  const isMounted = useIsMounted();

  const setSafeState = useCallback(
    (newState: T | ((prevState: T) => T)) => {
      if (isMounted()) {
        setState(newState);
      }
    },
    [isMounted],
  );

  return [state, setSafeState] as const;
}
