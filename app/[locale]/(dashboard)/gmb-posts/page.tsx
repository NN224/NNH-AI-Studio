import { ComingSoon } from '@/components/common/coming-soon';

export default function GMBPostsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Google Posts Automation"
          description="AI-assisted Google Business posts, bulk scheduling, and performance analytics are almost ready. You’ll be able to orchestrate everything from one intelligent workspace."
          icon="📣"
        />
      </div>
    </div>
  );
}
