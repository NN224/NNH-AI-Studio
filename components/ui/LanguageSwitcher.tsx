"use client";

import { Button } from "@/components/ui/button";
import { switchLocaleInPathname } from "@/lib/i18n/utils";
import { usePathname } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    if (isPending || newLocale === locale) return;

    try {
      // Get new path with switched locale
      const newPath = switchLocaleInPathname(pathname || "/", newLocale);

      // Get current search params and hash
      const searchParams =
        typeof window !== "undefined" ? window.location.search : "";
      const hash = typeof window !== "undefined" ? window.location.hash : "";

      // Build full URL
      const fullPath = newPath + searchParams + hash;
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = baseUrl + fullPath;

      // Debug logging
      if (
        typeof window !== "undefined" &&
        process.env.NODE_ENV === "development"
      ) {
        console.log("[LanguageSwitcher] Switching locale:", {
          from: locale,
          to: newLocale,
          originalPathname: pathname,
          newPath,
          fullUrl,
        });
      }

      // Use startTransition for better UX
      startTransition(() => {
        if (typeof window !== "undefined") {
          window.location.href = fullUrl;
        }
      });
    } catch (error) {
      logger.error(
        "Error switching locale",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  const isEnglish = locale === "en";
  const isArabic = locale === "ar";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isEnglish ? "default" : "outline"}
        size="sm"
        disabled={isPending || isEnglish}
        onClick={() => switchLocale("en")}
        className={cn(
          "flex items-center gap-2 transition-all",
          isEnglish
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60 disabled:opacity-50",
        )}
      >
        <Globe
          className={cn(
            "w-4 h-4",
            isEnglish ? "text-primary-foreground" : "text-primary",
            isPending && !isEnglish && "animate-spin",
          )}
        />
        <span className="text-sm font-medium">English</span>
        {isEnglish && <span className="text-xs">✓</span>}
      </Button>

      <Button
        variant={isArabic ? "default" : "outline"}
        size="sm"
        disabled={isPending || isArabic}
        onClick={() => switchLocale("ar")}
        className={cn(
          "flex items-center gap-2 transition-all",
          isArabic
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60 disabled:opacity-50",
        )}
      >
        <Globe
          className={cn(
            "w-4 h-4",
            isArabic ? "text-primary-foreground" : "text-primary",
            isPending && !isArabic && "animate-spin",
          )}
        />
        <span className="text-sm font-medium">العربية</span>
        {isArabic && <span className="text-xs">✓</span>}
      </Button>
    </div>
  );
}
