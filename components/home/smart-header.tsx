"use client";

import { SmartNotifications } from "@/components/home/smart-notifications";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHomeData } from "@/hooks/use-home-data";
import { Link } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";
import { authLogger } from "@/lib/utils/logger";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, LogOut, Settings, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Format last login to human-readable format
function formatLastLogin(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

interface SmartHeaderProps {
  user: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  lastLogin?: string;
}

export function SmartHeader({ user, lastLogin }: SmartHeaderProps) {
  const t = useTranslations("home.header");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      // Force redirect to login page
      window.location.href = "/auth/login";
    } catch (error) {
      authLogger.error(
        "Sign out error",
        error instanceof Error ? error : new Error(String(error)),
      );
      setIsSigningOut(false);
    }
  };

  return (
    <motion.header
      className="sticky top-8 z-50 border-b border-orange-500/20 bg-black/95 backdrop-blur md:supports-backdrop-filter:bg-black/80"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={user.avatar} alt={user.name || user.email} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-sm font-semibold">
              {t("welcome")}, {user.name || user.email.split("@")[0]}
            </h1>
            {lastLogin && (
              <p className="text-xs text-muted-foreground">
                {t("lastLogin")}: {formatLastLogin(lastLogin)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Live Indicator */}
          <LiveIndicator />

          <LanguageSwitcher />

          {/* Smart Notifications */}
          <SmartNotifications userId={user.id} />

          {/* Settings */}
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

// Live Indicator Component - shows when data is being fetched
function LiveIndicator() {
  const { isFetching } = useHomeData();

  return (
    <Badge
      variant="outline"
      className={`
        hidden sm:flex items-center gap-1.5 px-2 py-1
        border-green-500/50 text-green-400
        ${isFetching ? "animate-pulse" : ""}
      `}
    >
      <Wifi className={`h-3 w-3 ${isFetching ? "animate-pulse" : ""}`} />
      <span className="text-xs font-medium">
        {isFetching ? "Syncing..." : "Live"}
      </span>
    </Badge>
  );
}
