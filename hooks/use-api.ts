import { apiClient } from "@/lib/utils/api-client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showErrorToast?: boolean;
}

interface UseApiResult<T, TArgs extends unknown[] = unknown[]> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  execute: (...args: TArgs) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for making secure API calls with CSRF protection
 */
export function useApi<T, TArgs extends unknown[] = unknown[]>(
  fetcher: (...args: TArgs) => Promise<Response>,
  options: UseApiOptions<T> = {},
): UseApiResult<T, TArgs> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const { onSuccess, onError, showErrorToast = true } = options;

  const execute = useCallback(
    async (...args: TArgs): Promise<T | null> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetcher(...args);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || errorData.message || `HTTP ${response.status}`,
          );
        }

        const result = await response.json();
        setData(result);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);

        if (showErrorToast) {
          toast.error(error.message);
        }

        if (onError) {
          onError(error);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetcher, onSuccess, onError, showErrorToast],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}

/**
 * Hook for GET requests
 */
export function useApiGet<T>(
  url: string,
  options: UseApiOptions<T> & { autoFetch?: boolean } = {},
) {
  const { autoFetch = false, ...apiOptions } = options;
  const result = useApi<T>(() => apiClient.get(url), apiOptions);

  useEffect(() => {
    if (autoFetch) {
      result.execute();
    }
  }, [autoFetch]); // Don't include execute in deps to avoid loops

  return result;
}

/**
 * Hook for POST requests
 */
export function useApiPost<
  T,
  TData extends Record<string, unknown> = Record<string, unknown>,
>(url: string, options: UseApiOptions<T> = {}) {
  return useApi<T, [TData?]>(
    (data?: TData) => apiClient.post(url, data),
    options,
  );
}

/**
 * Hook for PUT requests
 */
export function useApiPut<
  T,
  TData extends Record<string, unknown> = Record<string, unknown>,
>(url: string, options: UseApiOptions<T> = {}) {
  return useApi<T, [TData?]>(
    (data?: TData) => apiClient.put(url, data),
    options,
  );
}

/**
 * Hook for PATCH requests
 */
export function useApiPatch<
  T,
  TData extends Record<string, unknown> = Record<string, unknown>,
>(url: string, options: UseApiOptions<T> = {}) {
  return useApi<T, [TData?]>(
    (data?: TData) => apiClient.patch(url, data),
    options,
  );
}

/**
 * Hook for DELETE requests
 */
export function useApiDelete<T>(url: string, options: UseApiOptions<T> = {}) {
  return useApi<T>(() => apiClient.delete(url), options);
}
