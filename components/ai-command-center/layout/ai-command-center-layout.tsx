"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AICommandCenterLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
}

/**
 * AI Command Center Layout
 * 70/30 split: Main content (left) + AI Companion (right)
 * Responsive: Stacks on mobile
 */
export function AICommandCenterLayout({
  children,
  sidebar,
  className,
}: AICommandCenterLayoutProps) {
  return (
    <div className={cn("flex flex-col lg:flex-row gap-6 w-full", className)}>
      {/* Main Content Area - 70% on desktop */}
      <div className="flex-1 lg:w-[70%] space-y-6">{children}</div>

      {/* AI Companion Sidebar - 30% on desktop */}
      <aside className="w-full lg:w-[30%] lg:sticky lg:top-6 lg:self-start">
        {sidebar}
      </aside>
    </div>
  );
}
