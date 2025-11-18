'use client';

import { useTranslations } from 'next-intl';

export default function ReviewsError({ reset }: { reset: () => void }) {
  const t = useTranslations('Reviews.error');
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <h2 className="text-lg font-semibold mb-4 text-red-400">{t('title')}</h2>
      <button
        onClick={() => {
          reset();
          window.dispatchEvent(new Event('dashboard:refresh'));
          console.log('[ReviewsError] Try Again triggered, dashboard refresh dispatched');
        }}
        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition"
      >
        {t('tryAgain')}
      </button>
    </div>
  );
}
