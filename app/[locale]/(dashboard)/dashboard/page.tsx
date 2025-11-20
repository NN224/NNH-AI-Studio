'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import NewDashboardClient from './NewDashboardClient';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase!.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NewDashboardClient />
    </Suspense>
  );
}
