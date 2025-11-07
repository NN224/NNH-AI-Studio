'use client';

import { Button } from '@/components/ui/button';

export function WeeklyTasksButton() {
  const handleGenerate = () => {
    // Functionality implemented in DashboardClient.tsx GenerateTasksButton
  };

  return (
    <Button 
      className="bg-orange-600 hover:bg-orange-700 text-white"
      onClick={handleGenerate}
    >
      Generate Weekly Tasks
    </Button>
  );
}

