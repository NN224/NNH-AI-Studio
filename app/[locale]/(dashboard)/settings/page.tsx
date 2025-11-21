"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GMBSettings } from "@/components/settings/gmb-settings";
import { toast } from "sonner";
import { forceGmbRefresh } from "@/lib/utils/gmb-events";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("dashboard.settings");
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user just connected GMB account
    const connected = searchParams?.get("connected");

    if (connected === "true") {
      // Show success toast
      toast.success(t("gmbConnected"), {
        description: t("gmbConnectedDesc"),
      });

      // Force refresh of all GMB-related data
      forceGmbRefresh();

      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      window.history.replaceState({}, "", url.toString());
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
