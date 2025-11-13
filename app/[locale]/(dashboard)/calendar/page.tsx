import { ComingSoon } from '@/components/common/coming-soon';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Content Calendar"
          description="Unified scheduling, AI playbooks, and automated post orchestration are coming soon. You’ll plan campaigns, tasks, and reviews from one intelligent timeline."
          icon="📅"
        />
      </div>
    </div>
  );
}