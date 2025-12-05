"use client";

/**
 * DashboardShell - Client Component
 *
 * The interactive shell of the dashboard including:
 * - Sidebar (responsive)
 * - Header
 * - Mobile Navigation
 * - Command Palette
 * - Error Boundary
 *
 * Separated from layout to keep the main layout as a Server Component.
 */

import { CommandPalette } from "@/components/layout/command-palette";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { SyncProgressBar } from "@/components/sync";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

interface UserProfile {
  name: string;
  avatarUrl: string | null;
}

interface DashboardShellProps {
  children: ReactNode;
  userProfile: UserProfile;
  userId: string;
  onCommandPaletteOpen: () => void;
  commandPaletteOpen: boolean;
  onCommandPaletteChange: (open: boolean) => void;
}

// Error Fallback Component
function ErrorFallback({
  error,
  resetError,
}: {
  error: unknown;
  resetError: () => void;
}) {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={resetError} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            className="gap-2"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  userProfile,
  userId,
  onCommandPaletteOpen,
  commandPaletteOpen,
  onCommandPaletteChange,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
      <SyncProgressBar />
      <div className="relative min-h-screen bg-background">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userProfile={userProfile}
        />

        <div className="lg:pl-[280px] pt-16">
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            onCommandPaletteOpen={onCommandPaletteOpen}
            userProfile={userProfile}
            userId={userId}
          />

          <main className="min-h-[calc(100vh-6rem)] px-4 py-6 lg:px-6 lg:py-8 pb-20 lg:pb-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>

        <MobileNav />

        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={onCommandPaletteChange}
        />
      </div>
    </Sentry.ErrorBoundary>
  );
}
