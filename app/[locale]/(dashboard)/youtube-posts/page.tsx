"use client"

import { ComingSoon } from '@/components/common/coming-soon';

export default function YoutubePostsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="YouTube Shorts Automation"
          description="Auto-generated shorts, scheduled uploads, and multi-location reporting are almost ready. Soon you'll orchestrate every YouTube touchpoint with AI."
          icon="🎬"
        />
      </div>
    </div>
  );
}


