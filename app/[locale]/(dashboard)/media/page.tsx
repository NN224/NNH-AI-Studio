import { ComingSoon } from '@/components/common/coming-soon';

export default function MediaLibraryPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Media Library"
          description="Centralized asset management, AI tagging, and brand-safe automation are almost here. Soon you'll curate every visual from one smart library."
          icon="🖼️"
        />
      </div>
    </div>
  );
}
