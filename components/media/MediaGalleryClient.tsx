'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MediaUploader } from './MediaUploader';
import { MediaGrid } from './MediaGrid';
import { MediaFilters } from './MediaFilters';

export function MediaGalleryClient({ locations, initialMedia }) {
  const [media, setMedia] = useState(initialMedia);
  const [filters, setFilters] = useState({ locationId: '' });
  
  const filteredMedia = media.filter(item => 
    !filters.locationId || item.location_id === filters.locationId
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <MediaUploader onUploadComplete={(newMedia) => {
          setMedia([...newMedia, ...media]);
        }} />
      </div>
      
      <MediaFilters 
        locations={locations}
        filters={filters}
        onFiltersChange={setFilters}
      />
      
      <MediaGrid media={filteredMedia} onDelete={(id) => {
        setMedia(media.filter(m => m.id !== id));
      }} />
    </div>
  );
}
