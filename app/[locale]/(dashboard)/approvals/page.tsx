'use client'

import { ComingSoon } from '@/components/common/coming-soon';
import { useTranslations } from 'next-intl';

export default function ApprovalsPage() {
  const t = useTranslations('ComingSoon.approvals');
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title={t('title')}
          description={t('description')}
            icon="✅"
        />
      </div>
    </div>
  );
}
