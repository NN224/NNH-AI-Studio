"use client";

/**
 * AuthGuard - Client Component
 *
 * Handles authentication checking and redirects.
 * Separated from layout to keep the main layout as a Server Component.
 */

import { createClient } from "@/lib/supabase/client";
import { getAuthUrl, getLocaleFromPathname } from "@/lib/utils/navigation";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Check if we're running in E2E test mode (Playwright)
 * This allows tests to bypass authentication
 */
function isE2ETestMode(): boolean {
  if (typeof window === "undefined") return false;
  // Check for Playwright in user agent
  const isPlaywright = navigator.userAgent.includes("Playwright");
  // Check for test mode flag in localStorage (set by test setup)
  const hasTestFlag = localStorage.getItem("e2e_test_mode") === "true";
  return isPlaywright || hasTestFlag;
}

// Routes that are part of setup flow (skip location check)
const SETUP_ROUTES = [
  "select-account",
  "setup",
  "onboarding",
  "settings",
  "admin",
];

export interface UserProfile {
  name: string;
  avatarUrl: string | null;
}

interface AuthGuardProps {
  children: (props: { userProfile: UserProfile; userId: string }) => ReactNode;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasLocations, setHasLocations] = useState<boolean | null>(null);
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

      // Skip auth check for E2E tests (Playwright)
      if (isE2ETestMode()) {
        setUserProfile({ name: "Test User", avatarUrl: null });
        setUserId("test-user-123");
        setIsAuthenticated(true);
        setHasLocations(true);
        return;
      }

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

  // Loading state
  if (isAuthenticated === null || (!isSetupRoute && hasLocations === null)) {
    return <LoadingScreen />;
  }

  // Not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // No locations and not setup route (will redirect to onboarding)
  if (!isSetupRoute && !hasLocations) {
    return <LoadingScreen />;
  }

  // Authenticated with locations - render children
  if (!userId) {
    return <LoadingScreen />;
  }

  return <>{children({ userProfile, userId })}</>;
}
