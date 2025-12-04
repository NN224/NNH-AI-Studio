// (dashboard)/layout.tsx - RADICAL CLEAN VERSION
//
// ONE SOURCE OF TRUTH: gmb_locations table in database
//
// Logic:
// - User has locations → Show Dashboard
// - User has no locations → Redirect to Onboarding
//
// NO MORE:
// - useGMBStatus() hook
// - Cookie checks
// - Multiple status checks
// - PROTECTED_ROUTES array
// - GMBOnboardingView component

"use client";

import { KeyboardProvider } from "@/components/keyboard/keyboard-provider";
import { CommandPalette } from "@/components/layout/command-palette";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { SyncProgressBar, SyncProvider } from "@/components/sync";
import { DynamicThemeProvider } from "@/components/theme/DynamicThemeProvider";
import { Button } from "@/components/ui/button";
import { BrandProfileProvider } from "@/contexts/BrandProfileContext";
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
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

interface UserProfile {
  name: string | null;
  avatarUrl: string | null;
}

// Routes that are part of setup flow (skip location check)
const SETUP_ROUTES = [
  "select-account",
  "setup",
  "onboarding",
  "settings",
  "admin",
];

// Loading Screen
function DashboardLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Error Fallback
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
  const [hasLocations, setHasLocations] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "User",
    avatarUrl: null,
  });
  const [userId, setUserId] = useState<string | null>(null);

  // Check if current route is part of setup flow
  const isSetupRoute = SETUP_ROUTES.some((route) =>
    pathname?.includes(`/${route}`),
  );

  // Get locale from pathname
  const locale = getLocaleFromPathname(pathname || "/");

  // ONE CHECK: Auth + Locations
  useEffect(() => {
    const checkAuthAndLocations = async () => {
      const currentPath = pathname || "/";

      if (!supabase) {
        router.push(getAuthUrl(locale, "login"));
        return;
      }

      // Check auth
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
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

      // Skip location check for setup routes
      if (isSetupRoute) {
        setHasLocations(true); // Allow access
        return;
      }

      // THE ONE AND ONLY CHECK: Does user have locations?
      const { count } = await supabase
        .from("gmb_locations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      const userHasLocations = (count || 0) > 0;
      setHasLocations(userHasLocations);

      // No locations? → Onboarding
      if (!userHasLocations) {
        router.push(`/${locale}/onboarding`);
      }
    };

    checkAuthAndLocations();
  }, [router, pathname, supabase, locale, isSetupRoute]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Loading state
  if (isAuthenticated === null || (!isSetupRoute && hasLocations === null)) {
    return <DashboardLoadingScreen />;
  }

  // Not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // No locations and not setup route (will redirect to onboarding)
  if (!isSetupRoute && !hasLocations) {
    return <DashboardLoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProfileProvider>
        <SyncProvider>
          <DynamicThemeProvider>
            <KeyboardProvider
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            >
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
                      onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
                      userProfile={userProfile}
                      userId={userId || undefined}
                    />

                    <main className="min-h-[calc(100vh-6rem)] px-4 py-6 lg:px-6 lg:py-8 pb-20 lg:pb-8">
                      <div className="mx-auto max-w-7xl">{children}</div>
                    </main>
                  </div>

                  <MobileNav />

                  <CommandPalette
                    open={commandPaletteOpen}
                    onOpenChange={setCommandPaletteOpen}
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
