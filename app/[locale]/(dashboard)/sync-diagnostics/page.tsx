import { SyncDiagnosticsPanel } from "@/components/gmb/sync-diagnostics";

export default function SyncDiagnosticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl">
        <SyncDiagnosticsPanel />
      </div>
    </div>
  );
}
