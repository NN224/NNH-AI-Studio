'use client';

import { useBrandProfile } from '@/contexts/BrandProfileContext';
import Image from 'next/image';

export function DashboardBanner() {
  const { profile } = useBrandProfile();

  if (!profile?.cover_image_url) {
    return null;
  }

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden mb-6 border border-border">
      <Image
        src={profile.cover_image_url}
        alt="Dashboard Banner"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}
