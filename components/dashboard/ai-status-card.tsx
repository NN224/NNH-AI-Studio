"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, CheckCircle, Clock, XCircle, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";

interface AIStatusCardProps {
  autoReplyEnabled: boolean;
  autoAnswerEnabled: boolean;
  profileOptimizerEnabled: boolean;
  reviewsAnalyzed: number;
  avgResponseTime: number;
  responseRate: number;
}

export function AIStatusCard({
  autoReplyEnabled = false,
  autoAnswerEnabled = false,
  profileOptimizerEnabled = false,
  reviewsAnalyzed = 0,
  avgResponseTime = 0,
  responseRate = 0,
}: AIStatusCardProps) {
  const t = useTranslations("dashboard.aiStatus");

  const getStatusIcon = (enabled: boolean) => {
    if (enabled) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Clock className="w-5 h-5 text-orange-500" />;
  };

  const getStatusBadge = (enabled: boolean) => {
    if (enabled) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          {t("active")}
        </Badge>
      );
    }
    return (
      <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
        {t("setupRequired")}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-500" />
              </div>
              <CardTitle className="text-2xl">{t("title")}</CardTitle>
            </div>
            <Link href="/settings/auto-pilot">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                {t("settings")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Features Status */}
          <div className="space-y-4">
            {/* Auto-Reply */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-3">
                {getStatusIcon(autoReplyEnabled)}
                <div>
                  <p className="font-medium">{t("autoReply.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("autoReply.description")}
                  </p>
                </div>
              </div>
              {getStatusBadge(autoReplyEnabled)}
            </div>

            {/* Auto-Answer */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-3">
                {getStatusIcon(autoAnswerEnabled)}
                <div>
                  <p className="font-medium">{t("autoAnswer.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("autoAnswer.description")}
                  </p>
                </div>
              </div>
              {getStatusBadge(autoAnswerEnabled)}
            </div>

            {/* Profile Optimizer */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-3">
                {getStatusIcon(profileOptimizerEnabled)}
                <div>
                  <p className="font-medium">{t("profileOptimizer.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("profileOptimizer.description")}
                  </p>
                </div>
              </div>
              {getStatusBadge(profileOptimizerEnabled)}
            </div>
          </div>

          {/* Stats */}
          {(autoReplyEnabled || autoAnswerEnabled) && (
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">
                    {reviewsAnalyzed}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("stats.reviewsAnalyzed")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {avgResponseTime}s
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("stats.avgResponse")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">
                    {responseRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("stats.responseRate")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
