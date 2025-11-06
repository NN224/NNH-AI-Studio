'use client';

import { Button } from '@/components/ui/button';

export default function QuestionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          Failed to load questions
        </h2>
        <p className="text-zinc-400 mb-6">{error.message || 'An unexpected error occurred'}</p>
        <Button
          onClick={reset}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}

