"use client";

import { GlobalSyncProvider } from "@/components/providers/global-sync-provider";
import { StoreProvider } from "@/components/providers/store-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { logger } from "@/lib/utils/logger";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus in production only
            refetchOnWindowFocus: process.env.NODE_ENV === "production",
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Enable background refetching
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
            // Show error for 5 seconds
            onError: (error) => {
              logger.error(
                "[Mutation Error]",
                error instanceof Error ? error : new Error(String(error)),
              );
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <GlobalSyncProvider>{children}</GlobalSyncProvider>
      </StoreProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}
