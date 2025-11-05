"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Eye, MessageSquare, MapPin, Phone, Globe, Sparkles, Maximize2, ExternalLink, Clock, Info, AlertCircle, CheckCircle2, Utensils, MessageCircle, Edit, Settings } from "lucide-react"
import type { GMBLocation } from "@/lib/types/database"
import { Link } from "@/lib/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditLocationDialog } from "./edit-location-dialog"
import { LocationAttributesDialog } from "./location-attributes-dialog"
import { GoogleUpdatedInfo } from "./google-updated-info"
import { LocationPerformanceWidget } from "./location-performance-widget"

interface LocationCardProps {
  location: GMBLocation
  index: number
}

export function LocationCard({ location, index }: LocationCardProps) {
  const router = useRouter()
  const [mapOpen, setMapOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [attributesOpen, setAttributesOpen] = useState(false)
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null)
  const [loadingMedia, setLoadingMedia] = useState(true)
  
  // Extract metadata
  const metadata = (location.metadata as any) || {}
  const profile = metadata.profile || {}
  const regularHours = metadata.regularHours || {}
  const openInfo = metadata.openInfo || {}
  const serviceItems = metadata.serviceItems || []
  const latlng = metadata.latlng || {}
  const relationshipData = metadata.relationshipData || {}
  const parentLocation = relationshipData.parentLocation
  const parentChain = relationshipData.parentChain
  const childrenLocations = relationshipData.childrenLocations || []
  
  // Extract useful metadata fields
  const mapsUri = metadata.mapsUri
  const newReviewUri = metadata.newReviewUri
  const placeId = metadata.placeId
  const hasPendingEdits = metadata.hasPendingEdits
  const hasVoiceOfMerchant = metadata.hasVoiceOfMerchant
  const canHaveFoodMenus = metadata.canHaveFoodMenus
  const isOpen = openInfo.status === 'OPEN'

  // Fetch media for cover/logo photos - Added comprehensive error handling for media fetch with user feedback
  useEffect(() => {
    async function fetchLocationMedia() {
      try {
        setLoadingMedia(true)
        const response = await fetch(`/api/gmb/media?locationId=${location.id}`)
        
        // Check if response is ok, throw error if not
        if (!response.ok) {
          throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        
        // Handle successful response - Batch state updates to prevent multiple re-renders in loop
        if (result.data?.media) {
          const media = result.data.media
          let foundCover = false
          let foundLogo = false
          let coverPhotoUrl: string | null = null
          let logoUrl: string | null = null
          
          media.forEach((item: any) => {
            const category = item.locationAssociation?.category || 
                           item.metadata?.locationAssociation?.category ||
                           item.metadata?.category ||
                           item.category
            const url = item.sourceUrl || item.googleUrl || item.url || item.thumbnailUrl
            
            if (!url) return
            
            if (category === 'COVER' && !foundCover) {
              foundCover = true
              coverPhotoUrl = url
            } else if (category === 'LOGO' && !foundLogo) {
              foundLogo = true
              logoUrl = url
            }
          })
          
          // Batch state updates after loop completion
          if (coverPhotoUrl) setCoverPhoto(coverPhotoUrl)
          if (logoUrl) setLogo(logoUrl)
          
          // If no categorized media found, use first photo as cover
          if (!foundCover && media.length > 0) {
            const firstPhoto = media.find((item: any) => {
              const url = item.sourceUrl || item.googleUrl || item.url || item.thumbnailUrl
              return url && (item.mediaFormat === 'PHOTO' || !item.mediaFormat)
            })
            if (firstPhoto) {
              setCoverPhoto(firstPhoto.sourceUrl || firstPhoto.googleUrl || firstPhoto.url || firstPhoto.thumbnailUrl)
            }
          }
        }
      } catch (error) {
        // Log error for debugging
        console.error('Error fetching location media:', error)
        
        // Set error state for user feedback (graceful degradation)
        // Clear any existing media data
        setCoverPhoto(null)
        setLogoPhoto(null)
      } finally {
        // Always stop loading state
        setLoadingMedia(false)
      }
    }
    
    fetchLocationMedia()
  }, [location.id])
  
  // Format business hours
  const formatHours = (hours: any) => {
    if (!hours?.periods || hours.periods.length === 0) return null
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return hours.periods.map((period: any) => {
      const openDay = dayAbbr[period.openDay === 'SUNDAY' ? 0 : 
        period.openDay === 'MONDAY' ? 1 :
        period.openDay === 'TUESDAY' ? 2 :
        period.openDay === 'WEDNESDAY' ? 3 :
        period.openDay === 'THURSDAY' ? 4 :
        period.openDay === 'FRIDAY' ? 5 : 6]
      const openTime = period.openTime ? `${period.openTime.hours || 0}:${String(period.openTime.minutes || 0).padStart(2, '0')}` : ''
      const closeTime = period.closeTime ? `${period.closeTime.hours || 0}:${String(period.closeTime.minutes || 0).padStart(2, '0')}` : ''
      return `${openDay} ${openTime}-${closeTime}`
    }).join(', ')
  }
  
  const businessHours = formatHours(regularHours)

  // Generate Google Maps embed URL - use location name for better labeling
  const getMapUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null // Don't show map if API key is not configured
    
    // Prefer location name for better map labeling, fallback to address or coordinates
    const locationQuery = location.location_name || location.address || 
      (latlng.latitude && latlng.longitude ? `${latlng.latitude},${latlng.longitude}` : null)
    
    if (!locationQuery) return null
    
    const encodedQuery = encodeURIComponent(locationQuery)
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedQuery}&zoom=15`
  }

  // Generate Google Maps search URL for external link - prefer mapsUri if available
  const getMapSearchUrl = () => {
    if (mapsUri) return mapsUri
    if (latlng.latitude && latlng.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${latlng.latitude},${latlng.longitude}`
    }
    if (!location.address) return null
    const encodedAddress = encodeURIComponent(location.address)
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
  }

  const mapUrl = getMapUrl()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        whileHover={{ y: -4 }}
        className="group relative"
      >
        <Card className="bg-card border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Sync status indicator */}
          <div className="absolute top-4 right-4 z-10">
            {location.is_syncing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-accent"
              />
            ) : (
              <div className="w-3 h-3 rounded-full bg-success/80" />
            )}
          </div>

          {/* Cover Photo */}
          {coverPhoto && (
            <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
              <img
                src={coverPhoto}
                alt={`${location.location_name} cover`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
            </div>
          )}

          <CardContent className="p-6 relative z-10">
            {/* Location header */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start justify-between gap-4">
                {/* Logo */}
                {logoPhoto && (
                  <div className="flex-shrink-0">
                    <img
                      src={logoPhoto}
                      alt={`${location.location_name} logo`}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-primary/30 shadow-lg"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground truncate">{location.location_name}</h3>
                    {logoPhoto && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {location.category && (
                      <Badge variant="secondary" className="bg-secondary text-muted-foreground">
                        {location.category}
                      </Badge>
                    )}
                    {isOpen && (
                      <Badge variant="default" className="bg-success/10 text-success border-success/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />
                        Open
                      </Badge>
                    )}
                    {hasPendingEdits && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        <AlertCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                        Pending Edits
                      </Badge>
                    )}
                    {hasVoiceOfMerchant && (
                      <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                        <MessageCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                        Voice of Merchant
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Profile Description */}
              {profile.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {profile.description}
                </p>
              )}
              
              {/* Business Hours */}
              {businessHours && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{businessHours}</span>
                </div>
              )}
              
              {/* Service Items Preview */}
              {serviceItems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {serviceItems.slice(0, 3).map((item: any, idx: number) => {
                    const displayName = item.structuredServiceItem?.description || 
                                      item.freeFormServiceItem?.label?.displayName || 
                                      'Service'
                    return (
                      <Badge key={idx} variant="outline" className="text-xs bg-secondary/50">
                        {displayName}
                      </Badge>
                    )
                  })}
                  {serviceItems.length > 3 && (
                    <Badge variant="outline" className="text-xs bg-secondary/50">
                      +{serviceItems.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Relationship Data */}
              {(parentLocation || parentChain || childrenLocations.length > 0) && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Relationships</p>
                  {parentLocation && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Parent: {parentLocation.placeId || 'Linked location'}
                    </div>
                  )}
                  {parentChain && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Chain: {parentChain.replace('chains/', '')}
                    </div>
                  )}
                  {childrenLocations.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {childrenLocations.length} child location{childrenLocations.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Contact info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {location.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{location.address}</span>
                  </div>
                )}
                {location.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span>{location.phone}</span>
                  </div>
                )}
                {location.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary shrink-0" />
                    <a
                      href={location.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-primary transition-colors"
                    >
                      {location.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Map Preview */}
            {location.address && (
              <div className="mb-4 rounded-lg overflow-hidden border border-primary/20 bg-secondary/50 relative group/map">
                {mapUrl ? (
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full"
                  />
                ) : (
                  <div className="h-[200px] bg-secondary/50 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    </div>
                  </div>
                )}
                {/* Map overlay buttons */}
                <div className="absolute inset-0 bg-black/0 group-hover/map:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/map:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMapOpen(true)}
                      className="bg-white/90 hover:bg-white text-foreground"
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      View Map
                    </Button>
                    {getMapSearchUrl() && (
                      <Button
                        size="sm"
                        variant="secondary"
                        asChild
                        className="bg-white/90 hover:bg-white text-foreground"
                      >
                        <a href={getMapSearchUrl() || '#'} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-secondary border border-primary/20">
                <div className="text-2xl font-bold text-primary">{(location.rating ?? 0).toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary border border-primary/20">
                <div className="text-2xl font-bold text-primary">{location.review_count}</div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary border border-primary/20">
                <div className="text-2xl font-bold text-primary">{(location.response_rate ?? 0).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Response</div>
              </div>
            </div>

            {/* Performance Metrics Widget */}
            <div className="mb-4">
              <LocationPerformanceWidget locationId={location.id} compact />
            </div>

            {/* Quick Links from Metadata */}
            {(mapsUri || newReviewUri || canHaveFoodMenus) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {mapsUri && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="text-xs bg-secondary/50 hover:bg-secondary border-primary/30"
                  >
                    <a href={mapsUri} target="_blank" rel="noopener noreferrer">
                      <MapPin className="w-3 h-3 mr-1" />
                      View on Maps
                    </a>
                  </Button>
                )}
                {newReviewUri && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="text-xs bg-secondary/50 hover:bg-secondary border-primary/30"
                  >
                    <a href={newReviewUri} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Leave Review
                    </a>
                  </Button>
                )}
                {canHaveFoodMenus && (
                  <Badge variant="outline" className="text-xs bg-secondary/50 border-primary/30">
                    <Utensils className="w-3 h-3 mr-1" />
                    Food Menu Available
                  </Badge>
                )}
              </div>
            )}

            {/* AI Insights */}
            {location.ai_insights && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI Insights</span>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-2">{location.ai_insights}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground h-11 md:h-9 min-h-[44px] md:min-h-0"
              >
                <Link href={`/locations?location=${location.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Profile
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground h-11 md:h-9 min-h-[44px] md:min-h-0"
              >
                <Link href={`/reviews?location=${location.id}`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reviews
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground h-11 md:h-9 min-h-[44px] md:min-h-0"
                onClick={() => setEditOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
            
            {/* Attributes button */}
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 bg-secondary/50 hover:bg-secondary border-primary/30"
              onClick={() => setAttributesOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Attributes
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Map Dialog */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {location.location_name}
              </span>
              {getMapSearchUrl() && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="gap-2"
                >
                  <a href={getMapSearchUrl() || '#'} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 relative">
            {mapUrl ? (
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
              />
            ) : (
              <div className="h-full bg-secondary/50 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">{location.location_name}</p>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mt-2">{location.address}</p>
                    )}
                  </div>
                  {getMapSearchUrl() && (
                    <Button asChild variant="outline">
                      <a href={getMapSearchUrl() || '#'} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Google Maps
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <EditLocationDialog
        location={location}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          // Refresh location data
          router.refresh()
        }}
      />

      {/* Attributes Dialog */}
      <LocationAttributesDialog
        location={location}
        open={attributesOpen}
        onOpenChange={setAttributesOpen}
        onSuccess={() => {
          // Refresh location data
          router.refresh()
        }}
      />
    </>
  )
}
