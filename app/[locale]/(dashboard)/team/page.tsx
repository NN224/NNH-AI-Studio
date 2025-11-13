import { ComingSoon } from '@/components/common/coming-soon';

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Team Workspace"
          description="Role-based access, approvals, and collaborative AI copilots are nearly done. Soon you'll manage every teammate and permission from one secure hub."
          icon="👥"
        />
      </div>
    </div>
  );
}

