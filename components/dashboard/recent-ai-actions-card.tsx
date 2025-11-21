"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface AIAction {
  id: string;
  type: "reply" | "answer" | "suggestion";
  content: string;
  timestamp: Date;
}

interface RecentAIActionsCardProps {
  actions: AIAction[];
  locale?: string;
}

export function RecentAIActionsCard({
  actions,
  locale = "en",
}: RecentAIActionsCardProps) {
  const t = useTranslations("dashboard.recentAIActions");

  const getIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case "reply":
        return <MessageSquare className={iconClass} />;
      case "answer":
        return <HelpCircle className={iconClass} />;
      case "suggestion":
        return <Lightbulb className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reply":
        return "text-green-500 bg-green-500/10";
      case "answer":
        return "text-blue-500 bg-blue-500/10";
      case "suggestion":
        return "text-orange-500 bg-orange-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: locale === "ar" ? ar : enUS,
      });
    } catch {
      return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <CardTitle className="text-2xl">{t("title")}</CardTitle>
            </div>
            {actions.length > 0 && (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  {t("viewAll")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-lg font-medium mb-2">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.slice(0, 5).map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(action.type)}`}
                  >
                    {getIcon(action.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">
                      {t(`types.${action.type}`)}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {action.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(action.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
