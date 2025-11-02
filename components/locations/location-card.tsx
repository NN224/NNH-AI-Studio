"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Eye, MessageSquare, MapPin, Phone, Globe, Sparkles, Maximize2, ExternalLink, Clock, Info, AlertCircle, CheckCircle2, Utensils, MessageCircle, Edit, Settings } from "lucide-react"
import type { GMBLocation } from "@/lib/types/database"
import Link from "next/link"
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

  // Generate Google Maps embed URL - use latlng if available, otherwise address
  const getMapUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null // Don't show map if API key is not configured
    
    if (latlng.latitude && latlng.longitude) {
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latlng.latitude},${latlng.longitude}&zoom=15`
    }
    if (!location.address) return null
    const encodedAddress = encodeURIComponent(location.address)
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=15`
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
              <div className="w-3 h-3 rounded-full bg-green-500" />
            )}
          </div>

          <CardContent className="p-6 relative z-10">
            {/* Location header */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-foreground truncate">{location.location_name}</h3>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {location.category && (
                      <Badge variant="secondary" className="bg-secondary text-muted-foreground">
                        {location.category}
                      </Badge>
                    )}
                    {isOpen && (
                      <Badge variant="default" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Open
                      </Badge>
                    )}
                    {hasPendingEdits && (
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending Edits
                      </Badge>
                    )}
                    {hasVoiceOfMerchant && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                        <MessageCircle className="w-3 h-3 mr-1" />
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
            <div className="grid grid-cols-3 gap-3 mb-4">
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
                className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground"
              >
                <Link href="/gmb-dashboard?tab=locations">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground"
              >
                <Link href={`/gmb-dashboard?tab=reviews&location=${location.id}`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reviews
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground"
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
