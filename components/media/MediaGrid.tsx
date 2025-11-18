'use client';

import { useTranslations } from 'next-intl';
import { MediaCard } from './MediaCard';

export function MediaGrid({ media, onDelete }) {
  const t = useTranslations('Media.grid');

  if (media.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-lg">
        <p className="text-zinc-500">{t('noMedia')}</p>
        <p className="text-zinc-600 text-sm">{t('getStarted')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {media.map(item => (
        <MediaCard key={item.id} mediaItem={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
