"use client";

import { t, useTranslations } from "@/lib/i18n/stub";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityLog,
  AutomationLogEntry,
  AutomationLocationCard,
  AutomationSettingsSummary,
  AutomationStatsCard,
  AutomationTemplates,
} from "./AutomationComponents";
import { gmbLogger } from "@/lib/utils/logger";

interface AutomationSummaryResponse {
  settings: AutomationSettingsSummary[];
  logs: AutomationLogEntry[];
}

export default function AutomationPage() {
  const tStats = useTranslations("Automation.stats");
  const [settings, setSettings] = useState<AutomationSettingsSummary[]>([]);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAutomationSummary() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/automation/summary", {
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load automation data");
        }

        const payload = (await response.json()) as AutomationSummaryResponse;
        if (!cancelled) {
          setSettings(payload.settings ?? []);
          setLogs(payload.logs ?? []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          gmbLogger.error(
            "[AutomationPage] Failed to load summary",
            fetchError instanceof Error
              ? fetchError
              : new Error(String(fetchError)),
          );
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load automation data",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAutomationSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const activeCount = settings.filter((item) => item.isEnabled).length;
    const pausedCount = settings.length - activeCount;
    const autoReplyEnabledCount = settings.filter(
      (item) => item.autoReplyEnabled,
    ).length;
    const totalRuns = logs.length;
    const successRate =
      logs.length > 0
        ? Math.round(
            (logs.filter((log) => log.status === "success").length /
              logs.length) *
              100,
          )
        : null;

    return {
      activeCount,
      pausedCount,
      autoReplyEnabledCount,
      totalRuns,
      successRate,
    };
  }, [logs, settings]);

  const logsByLocation = useMemo(() => {
    const map = new Map<string, AutomationLogEntry[]>();
    logs.forEach((log) => {
      const key = log.locationId ?? "unknown";
      const current = map.get(key) ?? [];
      current.push(log);
      map.set(key, current);
    });
    // ensure logs sorted by createdAt desc
    map.forEach((entries) =>
      entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
    return map;
  }, [logs]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🤖 {t("title")}
            </h1>
            <p className="text-zinc-400">{t("subtitle")}</p>
          </div>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("dashboard:refresh"));
                console.log(
                  "[AutomationPage] Create Automation clicked, dashboard refresh triggered",
                );
              }
            }}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition flex items-center gap-2 text-white"
          >
            ➕ {t("createAutomation")}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AutomationStatsCard
            title={t("activeAutomations")}
            value={stats.activeCount}
            icon="⚡"
            color="green"
          />
          <AutomationStatsCard
            title={tStats("paused")}
            value={stats.pausedCount}
            icon="⏸️"
            color="orange"
          />
          <AutomationStatsCard
            title={t("autoReplyEnabled")}
            value={stats.autoReplyEnabledCount}
            icon="🤖"
            color="blue"
          />
          <AutomationStatsCard
            title={tStats("successRate")}
            value={stats.successRate !== null ? `${stats.successRate}%` : "n/a"}
            icon="✅"
            color="purple"
          />
        </div>

        <AutomationTemplates />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {t("locationAutomations")}
            </h2>
            {loading && (
              <span className="text-xs text-zinc-500">{t("loading")}</span>
            )}
          </div>

          {!loading && settings.length === 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-sm text-zinc-400">
              {t("noSettings")}
            </div>
          )}

          {settings.map((item) => (
            <AutomationLocationCard
              key={item.id}
              settings={item}
              logs={logsByLocation.get(item.locationId) ?? []}
            />
          ))}
        </div>

        <ActivityLog logs={logs} />
      </div>
    </div>
  );
}
