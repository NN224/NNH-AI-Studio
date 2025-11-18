'use client';

import { useState, useEffect } from 'react';
import { Link, usePathname } from '@/lib/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, MapPin, Star, FileText, ChartBar as BarChart3, Settings, Zap, Users, Image as ImageIcon, MessageSquare, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserButton } from '@/components/auth/user-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useTranslations } from 'next-intl';
import { useBrandProfile } from '@/contexts/BrandProfileContext';
import Image from 'next/image';

interface UserProfile {
  name: string | null;
  avatarUrl: string | null;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  userProfile?: UserProfile;
}

interface NavigationItem {
  nameKey: string;
  href: string;
  icon: any;
  badge?: string | number;
}

export function Sidebar({ isOpen = true, onClose, userProfile }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('Dashboard');
  const { profile: brandProfile, loading: brandLoading } = useBrandProfile();
  
  const navigation: NavigationItem[] = [
    {
      nameKey: 'nav.dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      nameKey: 'nav.locations',
      href: '/locations',
      icon: MapPin,
    },
    {
      nameKey: 'nav.businessInfo',
      href: '/features',
      icon: Layers,
    },
    {
      nameKey: 'nav.reviews',
      href: '/reviews',
      icon: Star,
    },
    {
      nameKey: 'nav.questions',
      href: '/questions',
      icon: MessageSquare,
    },
    {
      nameKey: 'nav.gmbPosts',
      href: '/posts',
      icon: FileText,
    },
    {
      nameKey: 'nav.media',
      href: '/media',
      icon: ImageIcon,
    },
    {
      nameKey: 'nav.analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      nameKey: 'nav.automation',
      href: '/automation',
      icon: Zap,
    },
  ];

  const bottomNavigation: NavigationItem[] = [
    {
      nameKey: 'nav.whatsNew',
      href: '/changelog',
      icon: Sparkles,
    },
    {
      nameKey: 'nav.settings',
      href: '/settings',
      icon: Settings,
    },
  ];
  
  // On desktop (lg and above), always show sidebar regardless of isOpen
  // On mobile, hide/show based on isOpen
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return (
    <>
      <motion.aside
        initial={false}
        // On desktop: always x:0, on mobile: animate based on isOpen
        animate={{ x: isDesktop ? 0 : (isOpen ? 0 : -280) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed left-0 top-8 z-40 h-[calc(100vh-2rem)] w-[280px]',
          'border-r bg-background shadow-sm',
          // Always visible on desktop (lg and above)
          'block',
          // On desktop, ensure sidebar is always visible
          'lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-6">
            {brandProfile?.logo_url ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                <Image
                  src={brandProfile.logo_url}
                  alt="Brand Logo"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <MapPin className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {brandProfile?.brand_name || t('title')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('subtitle')}
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.nameKey} href={item.href} onClick={onClose}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{t(item.nameKey)}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium',
                            isActive
                              ? 'bg-primary-foreground text-primary'
                              : 'bg-primary text-primary-foreground'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            <Separator className="my-4" />

            <nav className="space-y-1">
              {bottomNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.nameKey} href={item.href} onClick={onClose}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{t(item.nameKey)}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t p-4 space-y-3">
            {/* Account box first for better ergonomics; subtle glass styling */}
            <div className="flex items-center gap-3 rounded-lg glass-strong p-3">
              <UserButton />
            </div>
            {/* Language switcher below to avoid accidental taps near profile */}
            <LanguageSwitcher />
          </div>
        </div>
      </motion.aside>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  );
}
