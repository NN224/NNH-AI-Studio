// (dashboard)/layout.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { KeyboardProvider } from "@/components/keyboard/keyboard-provider";
import { BrandProfileProvider } from "@/contexts/BrandProfileContext";
import { DynamicThemeProvider } from "@/components/theme/DynamicThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { getAuthUrl, getLocaleFromPathname } from "@/lib/utils/navigation";
import { PublicFooter } from "@/components/layout/public-footer";

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
        <DynamicThemeProvider>
          <KeyboardProvider
            onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          >
            <div className="relative min-h-screen bg-background">
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                userProfile={userProfile}
              />

              <div className="lg:pl-[280px] pt-8">
                <Header
                  onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                  onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
                  userProfile={userProfile}
                />

                <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6 lg:py-8 pb-20 lg:pb-8">
                  <div className="mx-auto max-w-7xl">{children}</div>
                </main>

                {/* Footer */}
                <PublicFooter />
              </div>

              <MobileNav />

              <CommandPalette
                open={commandPaletteOpen}
                onOpenChange={setCommandPaletteOpen}
              />
            </div>
          </KeyboardProvider>
        </DynamicThemeProvider>
      </BrandProfileProvider>
    </QueryClientProvider>
  );
}
