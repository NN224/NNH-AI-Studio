"use client"

import { SyncTestPanel } from "@/components/dashboard/sync-test-panel"

export default function TestSyncPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">GMB Sync Testing</h1>
        <p className="text-muted-foreground mt-1">
          Test and validate sync functionality, progress tracking, and auto-sync configuration
        </p>
      </div>

      {/* Sync Test Panel */}
      <SyncTestPanel />
    </div>
  )
}
