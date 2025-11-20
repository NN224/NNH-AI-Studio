'use client';

import { MediaCard } from './MediaCard';

export function MediaGrid({ media, onDelete }) {

  if (media.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-lg">
        <p className="text-zinc-500">No media found.</p>
        <p className="text-zinc-600 text-sm">Upload some images to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {media.map((item: any) => (
        <MediaCard key={item.id} mediaItem={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
