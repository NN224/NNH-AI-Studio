"use server";

import { createClient } from "@/lib/supabase/server";

export interface DayPerformance {
  day: string;
  views: number;
  clicks: number;
  calls: number;
}

export async function getWeeklyPerformance(): Promise<{
  data: DayPerformance[];
  aiInsight: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], aiInsight: null };
  }

  const { data: activeAccounts } = await supabase
    .from("gmb_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const activeAccountIds = activeAccounts?.map((acc) => acc.id) || [];

  if (activeAccountIds.length === 0) {
    return { data: [], aiInsight: null };
  }

  const { data: activeLocations } = await supabase
    .from("gmb_locations")
    .select("id")
    .eq("user_id", user.id)
    .in("gmb_account_id", activeAccountIds);

  const activeLocationIds = activeLocations?.map((loc) => loc.id) || [];

  if (activeLocationIds.length === 0) {
    return { data: [], aiInsight: null };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: metrics } = await supabase
    .from("gmb_performance_metrics")
    .select("metric_type, metric_value, metric_date")
    .in("location_id", activeLocationIds)
    .gte("metric_date", sevenDaysAgo.toISOString())
    .lte("metric_date", now.toISOString());

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekData: DayPerformance[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayName = days[(date.getDay() + 6) % 7];

    const dayMetrics =
      metrics?.filter((m) => {
        const metricDate = new Date(m.metric_date);
        return metricDate.toDateString() === date.toDateString();
      }) || [];

    const views = dayMetrics
      .filter((m) => m.metric_type.includes("IMPRESSIONS"))
      .reduce(
        (sum, m) =>
          sum +
          (typeof m.metric_value === "string"
            ? parseInt(m.metric_value)
            : m.metric_value),
        0,
      );

    const clicks = dayMetrics
      .filter((m) => m.metric_type === "WEBSITE_CLICKS")
      .reduce(
        (sum, m) =>
          sum +
          (typeof m.metric_value === "string"
            ? parseInt(m.metric_value)
            : m.metric_value),
        0,
      );

    const calls = dayMetrics
      .filter((m) => m.metric_type === "CALL_CLICKS")
      .reduce(
        (sum, m) =>
          sum +
          (typeof m.metric_value === "string"
            ? parseInt(m.metric_value)
            : m.metric_value),
        0,
      );

    weekData.push({
      day: dayName,
      views,
      clicks,
      calls,
    });
  }

  let aiInsight = null;

  if (weekData.length > 0) {
    const weekendViews = weekData
      .filter((d) => d.day === "Sat" || d.day === "Sun")
      .reduce((sum, d) => sum + d.views, 0);
    const weekdayViews = weekData
      .filter((d) => d.day !== "Sat" && d.day !== "Sun")
      .reduce((sum, d) => sum + d.views, 0);
    const avgWeekend = weekendViews / 2;
    const avgWeekday = weekdayViews / 5;

    if (avgWeekend > avgWeekday * 1.15) {
      aiInsight =
        "Weekends show 15%+ higher engagement. Consider posting on Friday evenings.";
    } else if (avgWeekday > avgWeekend * 1.15) {
      aiInsight =
        "Weekdays perform better. Focus content scheduling for Tuesday-Thursday.";
    } else {
      const peakDay = weekData.reduce(
        (max, d) => (d.views > max.views ? d : max),
        weekData[0],
      );
      aiInsight = `${peakDay.day} was your peak day. Replicate successful content from that day.`;
    }
  }

  return {
    data: weekData,
    aiInsight,
  };
}
