'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type LocationLite = {
  location_name: string | null;
  cover_photo_url?: string | null;
  logo_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
};

export default function BusinessHeader({ className }: { className?: string }) {
  const [loc, setLoc] = useState<LocationLite | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Grab one active location for branding
        const { data } = await supabase
          .from('gmb_locations')
          .select('location_name, rating, review_count, address')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (mounted) setLoc((data as any) || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="relative h-32 sm:h-40 md:h-48 bg-muted">
        {loading ? (
          <Skeleton className="absolute inset-0" />
        ) : loc?.cover_photo_url ? (
          <Image
            src={loc.cover_photo_url}
            alt="Cover"
            fill
            className="object-cover opacity-80"
            sizes="100vw"
            priority
          />
        ) : null}
      </div>
      <div className="flex items-center gap-4 px-4 pb-4 -mt-8">
        <div className="relative h-16 w-16 rounded-md border bg-background overflow-hidden">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : loc?.logo_url ? (
            <Image
              src={loc.logo_url}
              alt="Logo"
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">
            {loc?.location_name || 'Your Business'}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {loc?.address || '—'}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{(loc?.rating ?? 0).toFixed(1)} / 5</span>
            <span>•</span>
            <span>{loc?.review_count ?? 0} reviews</span>
          </div>
        </div>
      </div>
    </Card>
  );
}


