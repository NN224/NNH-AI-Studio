'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        // Grab one active location basics
        const { data: location } = await supabase
          .from('gmb_locations')
          .select('location_name, rating, review_count, address')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        // Try to fetch client branding (preferred)
        let logoUrl: string | null = null;
        let coverUrl: string | null = null;
        try {
          const { data: branding } = await supabase
            .from('client_profiles')
            .select('logo_url, cover_image_url, brand_name')
            .eq('user_id', user.id)
            .maybeSingle();
          logoUrl = (branding as any)?.logo_url ?? null;
          coverUrl = (branding as any)?.cover_image_url ?? null;
          // If brand_name exists use it instead of raw location name
          if (branding?.brand_name) {
            (location as any).location_name = branding.brand_name;
          }
        } catch {
          // ignore if table missing
        }
        // Fallback to profiles.avatar_url if no explicit logo
        if (!logoUrl) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', user.id)
              .maybeSingle();
            logoUrl = (profile as any)?.avatar_url ?? null;
          } catch {}
        }

        const composed: LocationLite | null = location
          ? {
              location_name: (location as any)?.location_name ?? null,
              rating: (location as any)?.rating ?? null,
              review_count: (location as any)?.review_count ?? null,
              address: (location as any)?.address ?? null,
              logo_url: logoUrl,
              cover_photo_url: coverUrl,
            }
          : null;

        if (mounted) setLoc(composed);
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
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm text-muted-foreground">
            لا توجد صورة غلاف بعد — ارفع صورة غلاف جميلة لتعزيز الهوية
          </div>
        )}
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
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground">
              ارفع شعارك لتعزيز الثقة
            </div>
          )}
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
      {(!loc?.logo_url || !loc?.cover_photo_url) && (
        <div className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-md border bg-background/60 p-3">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {(!loc?.logo_url && !loc?.cover_photo_url)
                ? 'أضف الشعار وصورة الغلاف ليظهر ملف عملك بشكل احترافي.'
                : !loc?.logo_url
                ? 'أضف شعارك ليزداد تميّز العلامة وثقة العملاء.'
                : 'أضف صورة غلاف تعبّر عن نشاطك.'}
            </div>
            <Button asChild size="sm" variant="secondary">
              <a href="/settings">إضافة الهوية الآن</a>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}


