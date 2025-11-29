'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type LocationLite = {
  id?: string | null
  location_name: string | null
  cover_photo_url?: string | null
  logo_url?: string | null
  rating?: number | null
  review_count?: number | null
  address?: string | null
}

export default function BusinessHeader({ className }: { className?: string }) {
  const [loc, setLoc] = useState<LocationLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState<false | 'logo' | 'cover'>(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }
  const { toast } = useToast()

  async function fetchFromGMB() {
    if (!loc?.id) return
    try {
      const res = await fetch(`/api/gmb/media?locationId=${loc.id}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`)
      type MediaItem = {
        sourceUrl?: string
        googleUrl?: string
        url?: string
        thumbnailUrl?: string
        locationAssociation?: { category?: string }
        metadata?: { locationAssociation?: { category?: string }; category?: string }
        category?: string
        mediaFormat?: string
        type?: string
      }
      const media: MediaItem[] = data?.data?.media || data?.media || []
      if (!Array.isArray(media) || media.length === 0) {
        toast({ title: 'No media found on GMB' })
        return
      }
      const pickUrl = (m: MediaItem): string | null =>
        m?.sourceUrl || m?.googleUrl || m?.url || m?.thumbnailUrl || null
      const getCat = (m: MediaItem) =>
        (
          m?.locationAssociation?.category ||
          m?.metadata?.locationAssociation?.category ||
          m?.metadata?.category ||
          m?.category ||
          ''
        )
          .toString()
          .toUpperCase()
      const cover =
        media.find((m: MediaItem) => getCat(m).includes('COVER')) ||
        media.find((m: MediaItem) => (m?.mediaFormat || m?.type) !== 'VIDEO')
      const logo = media.find((m: MediaItem) =>
        ['LOGO', 'PROFILE'].some((tag) => getCat(m).includes(tag)),
      )
      const nextCover = cover ? pickUrl(cover) : null
      const nextLogo = logo ? pickUrl(logo) : null
      setLoc((prev) =>
        prev
          ? {
              ...prev,
              cover_photo_url: nextCover ?? prev.cover_photo_url,
              logo_url: nextLogo ?? prev.logo_url,
            }
          : prev,
      )
      // Persist to DB
      try {
        if (loc?.id && (nextCover || nextLogo)) {
          await fetch('/api/locations/update-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: loc.id, cover_photo_url: nextCover, logo_url: nextLogo }),
          })
        }
      } catch {}
      toast({ title: 'Fetched from GMB' })
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast({ title: 'Fetch error', description: err.message || 'Failed to fetch from GMB' })
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        // Grab one active location basics
        const { data: location } = await supabase
          .from('gmb_locations')
          .select('id, location_name, rating, review_count, address, logo_url, cover_photo_url')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        // Use logo and cover from database first
        type LocationData = {
          id?: string
          logo_url?: string
          cover_photo_url?: string
          location_name?: string
          rating?: number
          review_count?: number
          address?: string
        }
        const loc = location as LocationData
        let logoUrl: string | null = loc?.logo_url || null
        let coverUrl: string | null = loc?.cover_photo_url || null

        // If no logo/cover in database, try to fetch from GMB media API
        if ((!logoUrl || !coverUrl) && loc?.id) {
          try {
            const mediaRes = await fetch(`/api/gmb/media?locationId=${loc.id}`, {
              cache: 'no-store',
            })
            const mediaJson = await mediaRes.json().catch(() => ({}))
            type MediaItem = {
              sourceUrl?: string
              googleUrl?: string
              url?: string
              thumbnailUrl?: string
              locationAssociation?: { category?: string }
              category?: string
              description?: string
              mediaFormat?: string
              type?: string
            }
            const media: MediaItem[] = mediaJson?.data?.media || []
            const pickUrl = (m: MediaItem): string | null =>
              m?.sourceUrl || m?.googleUrl || m?.url || m?.thumbnailUrl || null
            const isCover = (m: MediaItem) => {
              const c = (m?.locationAssociation?.category || m?.category || '')
                .toString()
                .toUpperCase()
              return c.includes('COVER')
            }
            const isLogo = (m: MediaItem) => {
              const c = (m?.locationAssociation?.category || m?.category || '')
                .toString()
                .toUpperCase()
              return c.includes('LOGO') || c.includes('PROFILE')
            }
            if (!coverUrl) {
              const cover =
                media.find(isCover) ||
                media.find((m) => (m?.description || '').toLowerCase().includes('cover')) ||
                media.find((m) => (m?.mediaFormat || m?.type) !== 'VIDEO') // first photo fallback
              coverUrl = cover ? pickUrl(cover) : coverUrl
            }
            if (!logoUrl) {
              const logo =
                media.find(isLogo) ||
                media.find((m) => (m?.description || '').toLowerCase().includes('logo')) ||
                media.find((m) => (m?.mediaFormat || m?.type) !== 'VIDEO') // first photo fallback
              logoUrl = logo ? pickUrl(logo) : logoUrl
            }
          } catch {
            /* ignore media fetch errors */
          }
        }

        const composed: LocationLite | null = location
          ? {
              id: loc?.id ?? null,
              location_name: loc?.location_name ?? null,
              rating: loc?.rating ?? null,
              review_count: loc?.review_count ?? null,
              address: loc?.address ?? null,
              logo_url: logoUrl,
              cover_photo_url: coverUrl,
            }
          : null

        if (mounted) setLoc(composed)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

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
            <Image src={loc.logo_url} alt="Logo" fill className="object-cover" sizes="64px" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">
            {loc?.location_name || 'Your Business'}
          </div>
          <div className="text-sm text-muted-foreground truncate">{loc?.address || '—'}</div>
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
              {!loc?.logo_url && !loc?.cover_photo_url
                ? 'No logo and cover found on your GMB profile. Please upload them to complete your profile.'
                : !loc?.logo_url
                  ? 'No logo found. Upload a logo to improve trust.'
                  : 'No cover image found. Upload a cover to showcase your business.'}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchFromGMB}>
                Fetch from GMB
              </Button>
              {!loc?.logo_url && (
                <Button size="sm" variant="secondary" onClick={() => setUploadOpen('logo')}>
                  Upload logo
                </Button>
              )}
              {!loc?.cover_photo_url && (
                <Button size="sm" variant="secondary" onClick={() => setUploadOpen('cover')}>
                  Upload cover
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={Boolean(uploadOpen)}
        onOpenChange={(o) => setUploadOpen(o ? uploadOpen || 'logo' : false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {uploadOpen === 'cover' ? 'Upload Cover Image' : 'Upload Logo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setUploadOpen(false)
                setFile(null)
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!file || !loc?.id) {
                  toast({ title: 'Select a file first' })
                  return
                }
                try {
                  setUploading(true)
                  const form = new FormData()
                  form.append('file', file)
                  form.append('locationId', String(loc.id))
                  const res = await fetch('/api/upload/image', { method: 'POST', body: form })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok || !data?.success || (!data?.publicUrl && !data?.media?.url)) {
                    throw new Error(data?.error || `Upload failed (${res.status})`)
                  }
                  const url = data.publicUrl || data.media?.url
                  setLoc((prev) =>
                    prev
                      ? {
                          ...prev,
                          logo_url: uploadOpen === 'logo' ? url : prev.logo_url,
                          cover_photo_url: uploadOpen === 'cover' ? url : prev.cover_photo_url,
                        }
                      : prev,
                  )
                  // Persist to DB
                  try {
                    if (loc?.id) {
                      await fetch('/api/locations/update-media', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: loc.id,
                          logo_url: uploadOpen === 'logo' ? url : undefined,
                          cover_photo_url: uploadOpen === 'cover' ? url : undefined,
                        }),
                      })
                    }
                  } catch {
                    /* ignore persist errors */
                  }
                  toast({ title: 'Uploaded successfully' })
                  setUploadOpen(false)
                  setFile(null)
                } catch (e: unknown) {
                  const err = e instanceof Error ? e : new Error(String(e))
                  toast({ title: 'Upload error', description: err.message || 'Failed' })
                } finally {
                  setUploading(false)
                }
              }}
              disabled={uploading || !file}
            >
              {uploading ? 'Uploading…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
