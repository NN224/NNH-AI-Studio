"use client";

/**
 * DashboardProviders - Client Component
 *
 * Wraps children with all necessary providers for the dashboard.
 * Separated from layout to keep the main layout as a Server Component.
 */

import { KeyboardProvider } from "@/components/keyboard/keyboard-provider";
import { SyncProvider } from "@/components/sync";
import { DynamicThemeProvider } from "@/components/theme/DynamicThemeProvider";
import { BrandProfileProvider } from "@/contexts/BrandProfileContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface DashboardProvidersProps {
  children: ReactNode;
  onCommandPaletteOpen?: () => void;
}

export function DashboardProviders({
  children,
  onCommandPaletteOpen,
}: DashboardProvidersProps) {
  // Create QueryClient inside component to avoid shared state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProfileProvider>
        <SyncProvider>
          <DynamicThemeProvider>
            <KeyboardProvider
              onCommandPaletteOpen={onCommandPaletteOpen ?? (() => {})}
            >
              {children}
            </KeyboardProvider>
          </DynamicThemeProvider>
        </SyncProvider>
      </BrandProfileProvider>
    </QueryClientProvider>
  );
}
