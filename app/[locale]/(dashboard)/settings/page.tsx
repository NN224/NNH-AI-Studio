"use client";

import { GMBSettings } from "@/components/settings/gmb-settings";
import { forceGmbRefresh } from "@/lib/utils/gmb-events";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("dashboard.settings");
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user just connected GMB account
    const connected =
      searchParams?.get("connected") || searchParams?.get("gmb_connected");

    if (connected === "true") {
      // Clean up URL FIRST to prevent reload loop
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("gmb_connected");
      window.history.replaceState({}, "", url.toString());

      // Show success toast with sync status
      toast.success(t("gmbConnected"), {
        description: "🔄 Syncing your data in the background...",
        duration: 5000,
      });

      // Show completion toast after estimated sync time (30 seconds)
      setTimeout(() => {
        toast.success("Sync Complete!", {
          description: "Your GMB data is now available across all pages.",
          duration: 4000,
        });
      }, 30000);

      // Force refresh of all GMB-related data
      forceGmbRefresh();
    }
  }, [searchParams, t]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <GMBSettings />
    </div>
  );
}
