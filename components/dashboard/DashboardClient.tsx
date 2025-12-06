"use client";

/**
 * DashboardClient - Client Component
 *
 * Orchestrates all client-side dashboard functionality:
 * - Authentication guard
 * - Providers
 * - Interactive shell
 *
 * This is the single client boundary for the dashboard layout.
 */

import { useState, type ReactNode } from "react";
import { AuthGuard } from "./AuthGuard";
import { DashboardProviders } from "./DashboardProviders";
import { DashboardShell } from "./DashboardShell";

interface DashboardClientProps {
  children: ReactNode;
}

export function DashboardClient({ children }: DashboardClientProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <AuthGuard>
      {({ userProfile, userId }) => (
        <DashboardProviders
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        >
          <DashboardShell
            userProfile={userProfile}
            userId={userId}
            onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            commandPaletteOpen={commandPaletteOpen}
            onCommandPaletteChange={setCommandPaletteOpen}
          >
            {children}
          </DashboardShell>
        </DashboardProviders>
      )}
    </AuthGuard>
  );
}
