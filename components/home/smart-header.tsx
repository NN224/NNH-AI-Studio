"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut, Settings } from "lucide-react";
import { Link } from "@/lib/navigation";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useTranslations } from "next-intl";

interface SmartHeaderProps {
  user: {
    name?: string;
    email: string;
    avatar?: string;
  };
  notifications?: number;
  lastLogin?: string;
}

export function SmartHeader({
  user,
  notifications = 0,
  lastLogin,
}: SmartHeaderProps) {
  const t = useTranslations("home.header");

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                {t("lastLogin")}: {lastLogin}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {notifications > 9 ? "9+" : notifications}
              </Badge>
            )}
          </Button>

          {/* Settings */}
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          {/* Sign Out */}
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
