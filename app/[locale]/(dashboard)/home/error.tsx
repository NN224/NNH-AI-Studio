"use client";

import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from "lucide-react";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-orange-500/10 rounded-full flex items-center justify-center">
          <Home className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">
          Couldn&apos;t load your dashboard
        </h2>
        <p className="text-zinc-400 mb-6">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              reset();
              window.dispatchEvent(new Event("dashboard:refresh"));
            }}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
