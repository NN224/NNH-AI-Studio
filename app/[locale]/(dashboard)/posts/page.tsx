import { ComingSoon } from '@/components/common/coming-soon';

export default function PostsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Posts Command Center"
          description="We're finishing up the new publishing workflow with AI-assisted drafting, scheduling, and bulk actions. Check back soon to manage all posts from one place."
          icon="📰"
        />
      </div>
    </div>
  );
}

