'use client'

import { ComingSoon } from '@/components/common/coming-soon';

export default function ApprovalsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Approvals Workflow"
          description="Centralized content approvals, AI guardrails, and compliance controls are nearly complete. Soon you’ll manage every review cycle from a single command center."
          icon="✅"
        />
      </div>
    </div>
  );
}
