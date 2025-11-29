// (dashboard)/layout.tsx

"use client";

import { GMBOnboardingView } from "@/components/ai-command-center/onboarding/gmb-onboarding-view";
import { KeyboardProvider } from "@/components/keyboard/keyboard-provider";
import { CommandPalette } from "@/components/layout/command-palette";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { SyncBanner, SyncProgressOverlay } from "@/components/sync";
import { BackgroundSyncWrapper } from "@/components/sync/background-sync-wrapper";
import { DynamicThemeProvider } from "@/components/theme/DynamicThemeProvider";
import { Button } from "@/components/ui/button";
import { BrandProfileProvider } from "@/contexts/BrandProfileContext";
import { SyncProvider } from "@/contexts/sync-context";
import { useGMBStatus } from "@/hooks/features/use-gmb";
import { createClient } from "@/lib/supabase/client";
import { getAuthUrl, getLocaleFromPathname } from "@/lib/utils/navigation";
import * as Sentry from "@sentry/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Create a client instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

interface UserProfile {
  name: string | null;
  avatarUrl: string | null;
}

// Loading Screen Component
function DashboardLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Routes that require GMB connection
const PROTECTED_ROUTES = [
  "reviews",
  "questions",
  "posts",
  "media",
  "analytics",
  "automation",
  "locations",
  "products",
  "features",
  "gmb-posts",
];

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "User",
    avatarUrl: null,
  });
  const [userId, setUserId] = useState<string | null>(null);

  // GMB Status - using new React Query hooks
  const { data: gmbStatus, isLoading: gmbLoading } = useGMBStatus();
  // Consider connected if has account OR has locations (data already synced)
  const gmbConnected = gmbStatus?.connected || gmbStatus?.hasLocations || false;

  // Check if current route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname?.includes(`/${route}`),
  );

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const currentPath = pathname || "/";

      if (!supabase) {
        const locale = getLocaleFromPathname(currentPath);
        router.push(getAuthUrl(locale, "login"));
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        const locale = getLocaleFromPathname(currentPath);
        const loginUrl = getAuthUrl(locale, "login");
        router.push(`${loginUrl}?redirectedFrom=${currentPath}`);
        return;
      }

      // Set user profile
      const name =
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      const avatarUrl = user.user_metadata?.avatar_url || null;

      setUserProfile({ name, avatarUrl });
      setUserId(user.id);
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router, pathname, supabase]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show loading screen while checking auth
  if (isAuthenticated === null) {
    return <DashboardLoadingScreen />;
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProfileProvider>
        <SyncProvider userId={userId || undefined}>
          <DynamicThemeProvider>
            <KeyboardProvider
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            >
              <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
                <div className="relative min-h-screen bg-background">
                  {/* Unified Sync Banner */}
                  <SyncBanner />

                  <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    userProfile={userProfile}
                  />

                  <div className="lg:pl-[280px] pt-16">
                    <Header
                      onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                      onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
                      userProfile={userProfile}
                      userId={userId || undefined}
                    />

                    <main className="min-h-[calc(100vh-6rem)] px-4 py-6 lg:px-6 lg:py-8 pb-20 lg:pb-8">
                      <div className="mx-auto max-w-7xl">
                        {/* Route Protection Logic */}
                        {isProtectedRoute && gmbLoading ? (
                          <div className="flex items-center justify-center min-h-[60vh]">
                            <div className="text-center space-y-3">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-muted-foreground">
                                Checking GMB connection...
                              </p>
                            </div>
                          </div>
                        ) : isProtectedRoute && !gmbConnected ? (
                          <GMBOnboardingView />
                        ) : (
                          children
                        )}
                      </div>
                    </main>
                  </div>

                  <MobileNav />

                  <CommandPalette
                    open={commandPaletteOpen}
                    onOpenChange={setCommandPaletteOpen}
                  />

                  {/* Unified Sync Progress Overlay for new users */}
                  <SyncProgressOverlay />

                  {/* Background Auto-Sync */}
                  <BackgroundSyncWrapper
                    enabled={true}
                    intervalMinutes={30}
                    showNotifications={false}
                  />
                </div>
              </Sentry.ErrorBoundary>
            </KeyboardProvider>
          </DynamicThemeProvider>
        </SyncProvider>
      </BrandProfileProvider>
    </QueryClientProvider>
  );
}
