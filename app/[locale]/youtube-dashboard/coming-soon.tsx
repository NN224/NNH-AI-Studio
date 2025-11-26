"use client";

import Link from "next/link";

export default function YouTubeComingSoon() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-2">YouTube Dashboard</h1>
        <p className="text-muted-foreground mb-6">Coming soon • قريباً</p>
        <Link
          href="/home"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
