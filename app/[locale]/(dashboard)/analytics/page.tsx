"use client";

import dynamic from "next/dynamic";

// Lazy load the heavy analytics dashboard (contains multiple recharts components)
const AnalyticsDashboard = dynamic(
  () =>
    import("@/components/analytics/analytics-dashboard").then(
      (mod) => mod.AnalyticsDashboard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="h-12 bg-zinc-900/50 rounded-lg animate-pulse w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-zinc-900/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="h-[400px] bg-zinc-900/50 rounded-lg animate-pulse" />
      </div>
    ),
  },
);

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-[1800px]">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
