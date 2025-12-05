import GMBDashboard from "@/components/gmb/gmb-dashboard";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function GMBPage() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto py-6">
        <GMBDashboard />
      </div>
    </ErrorBoundary>
  );
}
