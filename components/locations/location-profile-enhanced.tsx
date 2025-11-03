"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { 
  MapPin, Phone, Globe, Clock, Star, MessageSquare, Eye, 
  Edit, Settings, ExternalLink, CheckCircle2, AlertCircle, 
  MessageCircle, Utensils, Image as ImageIcon, Maximize2,
  Navigation, Sparkles
} from "lucide-react"
import type { GMBLocation } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditLocationDialog } from "./edit-location-dialog"
import { LocationAttributesDialog } from "./location-attributes-dialog"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LocationProfileEnhancedProps {
  location: GMBLocation
  onRefresh?: () => void
}

export function LocationProfileEnhanced({ location, onRefresh }: LocationProfileEnhancedProps) {
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [attributesOpen, setAttributesOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  
  const supabase = createClient()
  
  // Extract metadata
  const metadata = (location.metadata as any) || {}
  const profile = metadata.profile || {}
  const regularHours = metadata.regularHours || {}
  const openInfo = metadata.openInfo || {}
  const serviceItems = metadata.serviceItems || []
  const latlng = metadata.latlng || {}
  const mapsUri = metadata.mapsUri
  const newReviewUri = metadata.newReviewUri
  const placeId = metadata.placeId
  const hasPendingEdits = metadata.hasPendingEdits
  const hasVoiceOfMerchant = metadata.hasVoiceOfMerchant
  const canHaveFoodMenus = metadata.canHaveFoodMenus
  const isOpen = openInfo.status === 'OPEN'
  
  // Fetch media for cover/logo/profile photos
  useEffect(() => {
    async function fetchLocationMedia() {
      try {
        setLoading(true)
        
        const response = await fetch(`/api/gmb/media?locationId=${location.id}`)
        const result = await response.json()
        
        if (response.ok && result.data?.media) {
          const media = result.data.media
          
          // Look for cover, logo, and profile photos in metadata
          media.forEach((item: any) => {
            // Try multiple paths for category
            const category = item.locationAssociation?.category || 
                           item.metadata?.locationAssociation?.category ||
                           item.metadata?.category ||
                           item.category
            const url = item.sourceUrl || item.googleUrl || item.url || item.thumbnailUrl
            
            if (!url) return
            
            console.log('[LocationProfile] Media item:', {
              category,
              url: url.substring(0, 50) + '...',
              hasLocationAssociation: !!item.locationAssociation,
              hasMetadata: !!item.metadata,
              allKeys: Object.keys(item)
            })
            
            if (category === 'COVER' && !coverPhoto) {
              setCoverPhoto(url)
            } else if (category === 'LOGO' && !logoPhoto) {
              setLogoPhoto(url)
            } else if (category === 'PROFILE' && !profilePhoto) {
              setProfilePhoto(url)
            }
          })
          
          // If no categorized media found, use first photo as cover
          if (!coverPhoto && media.length > 0) {
            const firstPhoto = media.find((m: any) => 
              (m.mediaFormat !== 'VIDEO' && m.type !== 'VIDEO') && 
              (m.sourceUrl || m.googleUrl || m.url || m.thumbnailUrl)
            )
            if (firstPhoto) {
              const photoUrl = firstPhoto.sourceUrl || firstPhoto.googleUrl || firstPhoto.url || firstPhoto.thumbnailUrl
              setCoverPhoto(photoUrl)
              console.log('[LocationProfile] Using first photo as cover:', photoUrl.substring(0, 50) + '...')
            }
          }
        }
      } catch (error) {
        console.error('Error fetching location media:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLocationMedia()
  }, [location.id])
  
  // Format business hours
  const formatHours = (hours: any) => {
    if (!hours?.periods || hours.periods.length === 0) return null
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return hours.periods.map((period: any) => {
      const dayIndex = period.openDay === 'SUNDAY' ? 0 : 
        period.openDay === 'MONDAY' ? 1 :
        period.openDay === 'TUESDAY' ? 2 :
        period.openDay === 'WEDNESDAY' ? 3 :
        period.openDay === 'THURSDAY' ? 4 :
        period.openDay === 'FRIDAY' ? 5 : 6
      const openDay = dayNames[dayIndex]
      const openTime = period.openTime ? `${String(period.openTime.hours || 0).padStart(2, '0')}:${String(period.openTime.minutes || 0).padStart(2, '0')}` : ''
      const closeTime = period.closeTime ? `${String(period.closeTime.hours || 0).padStart(2, '0')}:${String(period.closeTime.minutes || 0).padStart(2, '0')}` : ''
      return `${openDay} ${openTime}-${closeTime}`
    }).join(', ')
  }
  
  const businessHours = formatHours(regularHours)
  
  // Generate Google Maps embed URL with location name
  const getMapUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null
    
    // Use location name in the query for better labeling
    const locationName = encodeURIComponent(location.location_name || '')
    
    if (latlng.latitude && latlng.longitude) {
      // Use coordinates with location name for accurate labeling
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latlng.latitude},${latlng.longitude}&zoom=15&maptype=roadmap`
    }
    
    if (location.address) {
      // Use address with location name
      const encodedAddress = encodeURIComponent(`${location.location_name}, ${location.address}`)
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=15`
    }
    
    return null
  }
  
  const getMapSearchUrl = () => {
    if (mapsUri) return mapsUri
    if (latlng.latitude && latlng.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${latlng.latitude},${latlng.longitude}`
    }
    if (location.address) {
      const encodedAddress = encodeURIComponent(`${location.location_name}, ${location.address}`)
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    }
    return null
  }
  
  const mapUrl = getMapUrl()
  
  return (
    <>
      <div className="space-y-6">
        {/* Hero Section with Cover Photo */}
        <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden group">
          {/* Cover Photo */}
          {coverPhoto ? (
            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img
                src={coverPhoto}
                alt={`${location.location_name} cover`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to gradient if image fails
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10" />
          )}
          
          {/* Logo and Title Section */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-end gap-4">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                {logoPhoto ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-4 border-white/90 shadow-2xl bg-white"
                  >
                    <img
                      src={logoPhoto}
                      alt={`${location.location_name} logo`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ) : profilePhoto ? (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-4 border-white/90 shadow-2xl bg-white">
                    <img
                      src={profilePhoto}
                      alt={`${location.location_name} profile`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-4 border-white/90 shadow-2xl bg-white/90 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Title and Badges */}
              <div className="flex-1 min-w-0 pb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  {location.location_name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {location.category && (
                    <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                      {location.category}
                    </Badge>
                  )}
                  {isOpen && (
                    <Badge className="bg-green-500/90 text-white border-green-400/50">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Open
                    </Badge>
                  )}
                  {hasVoiceOfMerchant && (
                    <Badge className="bg-blue-500/90 text-white border-blue-400/50">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Voice of Merchant
                    </Badge>
                  )}
                  {hasPendingEdits && (
                    <Badge className="bg-yellow-500/90 text-white border-yellow-400/50">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pending Edits
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons Overlay */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 hover:bg-white backdrop-blur-sm"
              onClick={() => setEditOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 hover:bg-white backdrop-blur-sm"
              onClick={() => setAttributesOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Attributes
            </Button>
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {profile.description && (
              <Card className="bg-card border-primary/30">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">About</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.description}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Map Section */}
            {location.address && (
              <Card className="bg-card border-primary/30 overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    {mapUrl ? (
                      <iframe
                        src={mapUrl}
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full"
                      />
                    ) : (
                      <div className="h-[400px] bg-secondary/50 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm font-semibold">{location.location_name}</p>
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                        </div>
                      </div>
                    )}
                    {/* Map Overlay Info */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {location.location_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {location.address}
                            </p>
                            {latlng.latitude && latlng.longitude && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {latlng.latitude.toFixed(6)}°N, {latlng.longitude.toFixed(6)}°E
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMapOpen(true)}
                              className="flex-shrink-0"
                            >
                              <Maximize2 className="w-4 h-4 mr-2" />
                              Fullscreen
                            </Button>
                            {getMapSearchUrl() && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="flex-shrink-0"
                              >
                                <a href={getMapSearchUrl()} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Open
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card className="bg-card border-primary/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {(location.rating ?? 0).toFixed(1)}
                    </div>
                    <div className="flex justify-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-4 h-4",
                            star <= Math.round(location.rating ?? 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-muted text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {location.review_count ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {(location.response_rate ?? 0).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Response</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Info */}
            <Card className="bg-card border-primary/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Contact</h3>
                <div className="space-y-3">
                  {location.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{location.address}</span>
                    </div>
                  )}
                  {location.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary shrink-0" />
                      <a href={`tel:${location.phone}`} className="text-sm text-foreground hover:text-primary">
                        {location.phone}
                      </a>
                    </div>
                  )}
                  {location.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary shrink-0" />
                      <a
                        href={location.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate"
                      >
                        {location.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {businessHours && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium mb-1">Hours:</div>
                        <div className="text-xs">{businessHours}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card className="bg-card border-primary/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    asChild
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Link href={`/gmb-dashboard?tab=reviews&location=${location.id}`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Reviews
                    </Link>
                  </Button>
                  {mapsUri && (
                    <Button
                      asChild
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <a href={mapsUri} target="_blank" rel="noopener noreferrer">
                        <Navigation className="w-4 h-4 mr-2" />
                        View on Maps
                      </a>
                    </Button>
                  )}
                  {newReviewUri && (
                    <Button
                      asChild
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <a href={newReviewUri} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Leave Review
                      </a>
                    </Button>
                  )}
                  {canHaveFoodMenus && (
                    <Badge variant="outline" className="w-full justify-start py-2">
                      <Utensils className="w-4 h-4 mr-2" />
                      Food Menu Available
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Fullscreen Map Dialog */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
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
                >
                  <a href={getMapSearchUrl()} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
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
                      <a href={getMapSearchUrl()} target="_blank" rel="noopener noreferrer">
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
      
      {/* Edit Dialog */}
      <EditLocationDialog
        location={location}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          onRefresh?.()
        }}
      />
      
      {/* Attributes Dialog */}
      <LocationAttributesDialog
        location={location}
        open={attributesOpen}
        onOpenChange={setAttributesOpen}
        onSuccess={() => {
          onRefresh?.()
        }}
      />
    </>
  )
}

