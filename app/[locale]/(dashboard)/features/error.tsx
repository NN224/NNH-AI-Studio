'use client'

import { AlertTriangle } from 'lucide-react'

export default function FeaturesError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          Failed to load profile settings
        </h2>
        <p className="text-zinc-400 mb-6">{error.message}</p>
        <button
          onClick={() => {
            reset();
            window.dispatchEvent(new Event('dashboard:refresh'));
            if (process.env.NODE_ENV !== 'production') {
              console.log('[FeaturesError] Try Again triggered, dashboard refresh dispatched');
            }
          }}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition text-white"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

