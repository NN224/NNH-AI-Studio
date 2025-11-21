"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Video,
  BarChart3,
  MessageSquare,
  MapPin,
  FileText,
  Sparkles,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

const quickActions = [
  {
    icon: Video,
    label: "uploadVideo",
    href: "/youtube-dashboard",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: BarChart3,
    label: "viewAnalytics",
    href: "/analytics",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: MessageSquare,
    label: "replyReviews",
    href: "/reviews",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: MapPin,
    label: "manageLocations",
    href: "/locations",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: FileText,
    label: "createPost",
    href: "/posts",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Sparkles,
    label: "aiStudio",
    href: "/ai-command-center",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function QuickActions() {
  const t = useTranslations("home.quickActions");

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">
          {t("title")}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                variant="outline"
                className="w-full h-auto flex-col gap-2 py-4 border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all group"
              >
                <div
                  className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-center">
                  {t(action.label)}
                </span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
