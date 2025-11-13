import { ComingSoon } from '@/components/common/coming-soon';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Analytics Command Center"
          description="Deep performance dashboards, AI benchmarking, and cross-channel intelligence are nearly ready. Soon you'll get unified analytics purpose-built for AI growth."
            icon="📈"
        />
      </div>
    </div>
  );
}
