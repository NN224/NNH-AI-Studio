/**
 * Dashboard Layout - SERVER COMPONENT
 *
 * This is a clean Server Component that delegates all client-side
 * functionality to DashboardClient.
 *
 * Benefits:
 * - Faster First Contentful Paint (FCP)
 * - Reduced JavaScript bundle on initial load
 * - Better SEO (though dashboard is authenticated)
 * - Cleaner separation of concerns
 *
 * Architecture:
 * - layout.tsx (Server) → DashboardClient (Client)
 *   - AuthGuard: Handles authentication
 *   - DashboardProviders: React Query, Sync, Theme, etc.
 *   - DashboardShell: Sidebar, Header, Navigation
 */

import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardClient>{children}</DashboardClient>;
}
