// (dashboard)/layout.tsx

'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommandPalette } from '@/components/layout/command-palette';
import { KeyboardProvider } from '@/components/keyboard/keyboard-provider';
import { BrandProfileProvider } from '@/contexts/BrandProfileContext';
import { DynamicThemeProvider } from '@/components/theme/DynamicThemeProvider';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
    name: string | null;
    avatarUrl: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  // Sidebar should be open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: 'User', avatarUrl: null });

  // Fetch user profile
  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const avatarUrl = user.user_metadata?.avatar_url || null;

        setUserProfile({
            name: name,
            avatarUrl: avatarUrl,
        });
    }
  };

  // On mobile, close sidebar by default
  useEffect(() => {
    fetchUserProfile();

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <BrandProfileProvider>
      <DynamicThemeProvider>
        <KeyboardProvider onCommandPaletteOpen={() => setCommandPaletteOpen(true)}>
          <div className="relative min-h-screen bg-background">
            <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
                userProfile={userProfile}
            />

            <div className="lg:pl-[280px]">
              <Header
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
                userProfile={userProfile}
              />

              <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6 lg:py-8 pb-20 lg:pb-8">
                <div className="mx-auto max-w-7xl">
                  {children}
                </div>
              </main>
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
  );
}