"use client";

import { Suspense } from "react";
import NewDashboardClient from "./NewDashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Auth is now handled by middleware and layout
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NewDashboardClient />
    </Suspense>
  );
}
