'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, MapPin, Star, FileText, ChartBar as BarChart3, Settings, Zap, Users, Image, Calendar, Webhook, CheckSquare, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserButton } from '@/components/auth/user-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Locations',
    href: '/dashboard/locations',
    icon: MapPin,
  },
  {
    name: 'Reviews',
    href: '/dashboard/reviews',
    icon: Star,
  },
  {
    name: 'Posts',
    href: '/dashboard/posts',
    icon: FileText,
  },
  {
    name: 'Calendar',
    href: '/dashboard/calendar',
    icon: Calendar,
  },
  {
    name: 'Media',
    href: '/dashboard/media',
    icon: Image,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Grid Tracking',
    href: '/dashboard/grid-tracking',
    icon: Grid3x3,
  },
  {
    name: 'Automation',
    href: '/dashboard/automation',
    icon: Zap,
  },
  {
    name: 'Approvals',
    href: '/dashboard/approvals',
    icon: CheckSquare,
  },
  {
    name: 'Webhooks',
    href: '/dashboard/webhooks',
    icon: Webhook,
  },
  {
    name: 'Team',
    href: '/dashboard/team',
    icon: Users,
  },
];

const bottomNavigation: NavigationItem[] = [
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  
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
          'fixed left-0 top-0 z-40 h-screen w-[280px]',
          'border-r bg-background shadow-sm',
          // Always visible on desktop (lg and above)
          'block',
          // On desktop, ensure sidebar is always visible
          'lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">GMB Dashboard</span>
              <span className="text-xs text-muted-foreground">
                Manage your business
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.name} href={item.href} onClick={onClose}>
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
                      <span className="flex-1">{item.name}</span>
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
                  <Link key={item.name} href={item.href} onClick={onClose}>
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
                      <span className="flex-1">{item.name}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
              <UserButton />
            </div>
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
