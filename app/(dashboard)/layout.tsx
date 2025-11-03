// (dashboard)/layout.tsx

'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommandPalette } from '@/components/layout/command-palette';
import { KeyboardProvider } from '@/components/keyboard/keyboard-provider';
import { createClient } from '@/lib/supabase/client'; // استيراد عميل Supabase

interface UserProfile {
    name: string | null;
    avatarUrl: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(); // إنشاء عميل Supabase

  // Sidebar should be open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // ⭐️ حالة جديدة لبيانات المستخدم
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: 'User', avatarUrl: null });

  // دالة جلب بيانات المستخدم
  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // يمكن جلب الاسم والصورة من جدول 'profiles' أو من بيانات المستخدم مباشرة
        // سنفترض الآن أننا نأخذها من بيانات المستخدم (metadata) أو جدول 'profiles'
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const avatarUrl = user.user_metadata?.avatar_url || null; // رابط الصورة

        // 💡 يمكنك إضافة منطق لجلب البيانات من جدول 'profiles' هنا إذا كان ملفك الشخصي موجودًا في DB

        setUserProfile({
            name: name,
            avatarUrl: avatarUrl,
        });
    }
  };

  // On mobile, close sidebar by default
  useEffect(() => {
    fetchUserProfile(); // ⭐️ جلب الملف الشخصي عند التحميل

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
    <KeyboardProvider onCommandPaletteOpen={() => setCommandPaletteOpen(true)}>
      <div className="relative min-h-screen bg-background">
        {/* ⭐️ تمرير بيانات المستخدم إلى الشريط الجانبي */}
        <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
            userProfile={userProfile} // تمرير البروفايل
        />

        <div className="lg:pl-[280px]">
          {/* ⭐️ تمرير بيانات المستخدم إلى شريط الرأس */}
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            userProfile={userProfile} // تمرير البروفايل
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
  );
}