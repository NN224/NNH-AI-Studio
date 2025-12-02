"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { MediaUploader } from "./MediaUploader";
import { MediaGrid } from "./MediaGrid";
import { MediaFilters } from "./MediaFilters";

interface Location {
  id: string;
  location_name: string;
}

interface MediaItem {
  id: string;
  url: string;
  location_id?: string;
  metadata?: Record<string, unknown>;
}

interface MediaGalleryClientProps {
  locations: Location[];
  initialMedia: MediaItem[];
}

export function MediaGalleryClient({
  locations,
  initialMedia,
}: MediaGalleryClientProps) {
  const [media, setMedia] = useState(initialMedia);
  const [filters, setFilters] = useState({ locationId: "" });

  const filteredMedia = media.filter(
    (item) => !filters.locationId || item.location_id === filters.locationId,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <MediaUploader
          locationId={filters.locationId}
          onUploadComplete={(newMedia: MediaItem[]) => {
            setMedia([...newMedia, ...media]);
          }}
        />
      </div>

      <MediaFilters
        locations={locations}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <MediaGrid
        media={filteredMedia}
        onDelete={(id: string) => {
          setMedia(media.filter((m) => m.id !== id));
        }}
      />
    </div>
  );
}
