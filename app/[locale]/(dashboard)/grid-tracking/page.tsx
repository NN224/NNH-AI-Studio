import { ComingSoon } from '@/components/common/coming-soon';

export default function GridTrackingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Local Grid Tracking"
          description="Hyper-local rank tracking with AI diagnostics and competitive overlays is on the way. Soon you'll monitor SERP positions across every grid point in seconds."
          icon="🗺️"
        />
      </div>
    </div>
  );
}
