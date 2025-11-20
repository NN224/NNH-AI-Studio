"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "@/lib/navigation"
import { getRecentActivity } from "@/lib/monitoring/audit"
import { getMetricsSummary } from "@/lib/monitoring/metrics"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default async function MetricsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  await params // Locale is not used but required by Next.js routing
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // TypeScript doesn't know that user is not null after redirect
  // but we've already checked and redirected if null, so it's safe
  const userId = user.id

  const [activity, metrics] = await Promise.all([
    getRecentActivity(userId, 10),
    getMetricsSummary(userId),
  ])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Essential insight into your sync jobs and recent account activity.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sync Success Rate</CardTitle>
            <CardDescription>Based on your recent sync attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.sync.userRate}%</p>
            <p className="text-sm text-muted-foreground">
              {metrics.sync.userSuccess} successes · {metrics.sync.userFailure} failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Global sync success rate today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.sync.globalRate}%</p>
            <p className="text-sm text-muted-foreground">{metrics.sync.total} syncs today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
            <CardDescription>Unique accounts active today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.dailyActiveUsers}</p>
            <p className="text-sm text-muted-foreground">
              Avg sync response: {metrics.api.averageResponseMs} ms
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 10 recorded actions for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
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
                      {formatTimestamp(entry.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.resource_type || "general"} · {entry.resource_id || "n/a"}
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
  )
}

