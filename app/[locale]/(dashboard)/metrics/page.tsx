"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/lib/navigation";
import { getRecentActivity } from "@/lib/monitoring/audit";
import { getMetricsSummary } from "@/lib/monitoring/metrics";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function formatTimestamp(value: string, locale: string) {
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
}

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getTranslations({ locale, namespace: "dashboard.metrics" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const userId = user!.id;

  const [activity, metrics] = await Promise.all([
    getRecentActivity(userId, 10),
    getMetricsSummary(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("syncSuccessRate.title")}</CardTitle>
            <CardDescription>
              {t("syncSuccessRate.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.sync.userRate}%</p>
            <p className="text-sm text-muted-foreground">
              {metrics.sync.userSuccess} {t("recentActivity.successes")} ·{" "}
              {metrics.sync.userFailure} {t("recentActivity.failures")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("platformHealth.title")}</CardTitle>
            <CardDescription>{t("platformHealth.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.sync.globalRate}%</p>
            <p className="text-sm text-muted-foreground">
              {metrics.sync.total} {t("recentActivity.syncsToday")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dailyActiveUsers.title")}</CardTitle>
            <CardDescription>
              {t("dailyActiveUsers.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.dailyActiveUsers}</p>
            <p className="text-sm text-muted-foreground">
              {t("recentActivity.averageResponse")}:{" "}
              {metrics.api.averageResponseMs} ms
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentActivity.title")}</CardTitle>
          <CardDescription>{t("recentActivity.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("recentActivity.noActivity")}
            </p>
          ) : (
            <ul className="space-y-4">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-border p-3 text-sm text-foreground"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.created_at, locale)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.resource_type || "general"} ·{" "}
                    {entry.resource_id || "n/a"}
                  </div>
                  {entry.metadata && (
                    <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
