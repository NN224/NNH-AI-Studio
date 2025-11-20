"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Video, RefreshCw, Download, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { toast } from "sonner"

interface MediaItem {
  id: string
  name?: string
  sourceUrl?: string
  googleUrl?: string
  mediaFormat?: string
  type?: string  // Alias for mediaFormat, used by database items
  thumbnailUrl?: string
  createTime?: string
  updateTime?: string
  location_id?: string
  fromDatabase?: boolean
  fromGmbMediaTable?: boolean
}

interface MediaGalleryProps {
  locationId?: string
}

export function MediaGallery({ locationId }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }

  useEffect(() => {
    fetchMedia()
    
    // Listen for sync completion event
    const handleSyncComplete = () => {
      console.log('[MediaGallery] Sync completed, refreshing media...')
      fetchMedia()
    }
    
    window.addEventListener('gmb-sync-complete', handleSyncComplete)
    
    return () => {
      window.removeEventListener('gmb-sync-complete', handleSyncComplete)
    }
  }, [locationId])

  async function fetchMedia() {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: authError
      } = await supabase!.auth.getUser()

      if (authError || !user) {
        setError("Please sign in to view media")
        setLoading(false)
        return
      }

      // Build API URL
      const apiUrl = locationId 
        ? `/api/gmb/media?locationId=${locationId}`
        : '/api/gmb/media'

      console.log('[MediaGallery] Fetching media from:', apiUrl)

      const response = await fetch(apiUrl)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch media')
      }

      console.log('[MediaGallery] Received media:', result.data?.media?.length || 0, 'items')

      setMedia(result.data?.media || [])
    } catch (err) {
      console.error("Error fetching media:", err)
      setError(err instanceof Error ? err.message : "Failed to load media")
      setMedia([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchMedia()
    setRefreshing(false)
    toast.success("Media refreshed successfully")
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return ''
    }
  }

  const getMediaUrl = (item: MediaItem) => {
    return item.googleUrl || item.sourceUrl || item.thumbnailUrl || ''
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Media Gallery</h2>
            <p className="text-muted-foreground">Photos and videos from your locations</p>
          </div>
          <Button disabled className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <LoadingSkeleton type="card" count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-red-500/30">
        <CardContent className="p-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <ImageIcon className="w-12 h-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Error Loading Media</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Media Gallery</h2>
          <p className="text-muted-foreground">
            {media.length} {media.length === 1 ? "item" : "items"}
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty State */}
      {media.length === 0 && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">No media yet</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Photos and videos from your Google My Business locations will appear here after syncing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => {
            const mediaUrl = getMediaUrl(item)
            const isVideo = item.mediaFormat === 'VIDEO' || item.type === 'VIDEO'
            
            return (
              <Card 
                key={item.id} 
                className="bg-card border-primary/30 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 cursor-pointer overflow-hidden group"
                onClick={() => setSelectedMedia(item)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    {mediaUrl ? (
                      <>
                        {isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <Video className="w-12 h-12 text-primary" />
                            <div className="absolute top-2 right-2">
                              <span className="text-xs bg-black/70 text-white px-2 py-1 rounded">VIDEO</span>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={item.thumbnailUrl || mediaUrl} 
                            alt={item.name || 'Media'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement
                              target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E`
                            }}
                          />
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            {mediaUrl && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(mediaUrl, '_blank')
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Media Info */}
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(item.createTime || item.updateTime)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-card rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={() => setSelectedMedia(null)}
            >
              ×
            </Button>
            <div className="p-6">
              {selectedMedia.mediaFormat === 'VIDEO' || selectedMedia.type === 'VIDEO' ? (
                <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                  <Video className="w-24 h-24 text-primary" />
                  <p className="ml-4 text-muted-foreground">Video preview not available</p>
                </div>
              ) : (
                <img 
                  src={getMediaUrl(selectedMedia)}
                  alt={selectedMedia.name || 'Media'}
                  className="max-w-full max-h-[70vh] mx-auto rounded-lg"
                />
              )}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{selectedMedia.mediaFormat || selectedMedia.type || 'PHOTO'}</p>
                </div>
                {(selectedMedia.createTime || selectedMedia.updateTime) && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{formatDate(selectedMedia.createTime || selectedMedia.updateTime)}</p>
                  </div>
                )}
                {getMediaUrl(selectedMedia) && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => window.open(getMediaUrl(selectedMedia), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

