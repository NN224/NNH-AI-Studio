'use client';

import { ComingSoon } from '@/components/common/coming-soon';
import { useTranslations } from 'next-intl';

export default function MediaLibraryPage() {
  const t = useTranslations('ComingSoon.media');
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title={t('title')}
          description={t('description')}
          icon="🖼️"
          />
      </div>
    </div>
  );
}
