"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Play, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export function EmptyState() {
  const t = useTranslations("home.emptyState");

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-3">{t("title")}</h2>

        {/* Description */}
        <p className="text-muted-foreground max-w-md mb-8">
          {t("description")}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/settings">
            <Button size="lg" className="gap-2" aria-label={t("connectGMB")}>
              <Building2 className="w-5 h-5" />
              {t("connectGMB")}
            </Button>
          </Link>

          <Link href="/youtube-dashboard">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-primary/30"
              aria-label={t("connectYouTube")}
            >
              <Play className="w-5 h-5" />
              {t("connectYouTube")}
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground mt-6">{t("helpText")}</p>
      </CardContent>
    </Card>
  );
}
