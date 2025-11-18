'use client';

import { ComingSoon } from '@/components/common/coming-soon';

export default function PostsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Posts Management"
          description="Create and manage your Google My Business posts here. Coming soon!"
          icon="📰"
        />
      </div>
    </div>
  );
}
