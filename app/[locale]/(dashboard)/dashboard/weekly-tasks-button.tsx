'use client';

import { Button } from '@/components/ui/button';

export function WeeklyTasksButton() {
  const handleGenerate = () => {
    try {
      window.dispatchEvent(new Event('dashboard:refresh'));
    } catch (error) {
      console.error('[WeeklyTasksButton] Error during generation:', error);
    }
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
