"use client";

import { useKeyboard } from "@/components/keyboard/keyboard-provider";
import { RealtimeConnectionIndicator } from "@/components/dashboard/realtime-connection-indicator";
import { GlobalSyncButton } from "@/components/sync/global-sync-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  Command,
  Keyboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authLogger } from "@/lib/utils/logger";

interface UserProfileData {
  name: string | null;
  avatarUrl: string | null;
  email?: string | null;
}

interface HeaderProps {
  onMenuClick: () => void;
  onCommandPaletteOpen: () => void;
  userProfile: UserProfileData;
  userId?: string;
}

// Route names mapping
const getRouteName = (path: string): string => {
  const routeMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/locations": "Locations",
    "/reviews": "Reviews",
    "/questions": "Questions",
    "/posts": "Posts",
    "/media": "Media",
    "/analytics": "Analytics",
    "/features": "Business Info",
    "/automation": "Automation",
    "/settings": "Settings",
  };
  return routeMap[path] || path.split("/").pop() || path;
};

// ⭐️ دالة مساعدة للحروف الأولى
const getInitials = (nameOrEmail?: string | null) => {
  if (!nameOrEmail) return "U";
  const parts = nameOrEmail.split(" ");
  if (parts.length > 1) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return nameOrEmail.charAt(0).toUpperCase();
};

export function Header({
  onMenuClick,
  onCommandPaletteOpen,
  userProfile,
  userId,
}: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { showShortcutsModal } = useKeyboard();
  const supabase = createClient();
  const router = useRouter();

  // Use real notifications hook with Realtime
  const {
    notifications = [],
    isLoading: loadingNotifications,
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
  } = useNotifications(userId);

  // Sign out handler
  const handleSignOut = async () => {
    if (!supabase) {
      authLogger.warn("Supabase client not initialized", { userId });
      return;
    }
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const safePath = pathname || "/";
  const pathSegments = safePath.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    return {
      name:
        getRouteName(path) ||
        segment.charAt(0).toUpperCase() + segment.slice(1),
      path,
    };
  });

  return (
    <header className="sticky top-8 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        <nav className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4" />}
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "hover:text-foreground"
                }
              >
                {crumb.name}
              </span>
            </div>
          ))}
        </nav>

        <div className="flex flex-1 items-center gap-2 lg:gap-4">
          <div className="relative hidden w-full max-w-sm lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search or press Cmd+K..."
              className="w-full pl-9 pr-4"
              onClick={onCommandPaletteOpen}
              readOnly
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onCommandPaletteOpen}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Realtime Connection Indicator - Disabled temporarily
          <RealtimeConnectionIndicator compact showDetails userId={userId} />
          */}

          {/* Global Sync Button */}
          <GlobalSyncButton />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={showShortcutsModal}
                >
                  <Keyboard className="h-5 w-5" />
                  <span className="sr-only">Keyboard shortcuts</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Press ? for shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <motion.button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-[hsl(var(--neuro-bg))] shadow-[6px_6px_12px_hsl(var(--shadow-dark)),-6px_-6px_12px_hsl(var(--shadow-light))] hover:shadow-[4px_4px_8px_hsl(var(--shadow-dark)),-4px_-4px_8px_hsl(var(--shadow-light))] active:shadow-[inset_3px_3px_6px_hsl(var(--shadow-dark)),inset_-3px_-3px_6px_hsl(var(--shadow-light))] transition-all duration-200 flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-[400px]">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No new notifications
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 cursor-pointer",
                        !notification.read && "bg-accent/50",
                      )}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="w-full justify-center text-center"
                    onClick={() => markAllAsRead()}
                  >
                    Mark all as read
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden lg:block">
            {/* ⭐️ تم استبدال UserButton هنا بـ DropdownMenu الملف الشخصي ⭐️ */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full p-0"
                >
                  <Avatar className="h-10 w-10 border border-primary/30">
                    {userProfile.avatarUrl && (
                      <AvatarImage
                        src={userProfile.avatarUrl}
                        alt={userProfile.name || "User"}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(userProfile.name || userProfile.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {userProfile.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile.email || "user@example.com"}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings" passHref>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-500 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
