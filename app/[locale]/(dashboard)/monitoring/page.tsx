import { Metadata } from 'next';
import { MonitoringDashboard } from '@/components/dashboard/monitoring-dashboard';

export const metadata: Metadata = {
  title: 'System Monitoring',
  description: 'Real-time system monitoring and alerts',
};

export default function MonitoringPage() {
  return <MonitoringDashboard />;
}
