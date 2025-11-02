"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Maximize2, Minimize2, ExternalLink, Navigation } from "lucide-react"
import type { GMBLocation } from "@/lib/types/database"

interface LocationsMapViewProps {
  locations: GMBLocation[]
  selectedLocation?: GMBLocation | null
  onLocationSelect?: (location: GMBLocation) => void
}

export function LocationsMapView({ locations, selectedLocation, onLocationSelect }: LocationsMapViewProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (locations.length === 0) return

    // Get locations with coordinates
    const locationsWithCoords = locations.filter(loc => {
      const metadata = (loc.metadata as any) || {}
      const latlng = metadata.latlng || {}
      return latlng.latitude && latlng.longitude
    })

    if (locationsWithCoords.length === 0) {
      // Fallback: use first location's address
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        setMapUrl(null)
        return
      }
      
      const firstLocation = locations[0]
      if (firstLocation.address) {
        const encodedAddress = encodeURIComponent(firstLocation.address)
        setMapUrl(`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=12`)
      }
      return
    }

    // Create markers for all locations
    const markers = locationsWithCoords.map(loc => {
      const metadata = (loc.metadata as any) || {}
      const latlng = metadata.latlng || {}
      return `${latlng.latitude},${latlng.longitude}`
    })

    // Use first location as center, or calculate center point
    const center = locationsWithCoords[0]
    const metadata = (center.metadata as any) || {}
    const latlng = metadata.latlng || {}
    const centerLat = latlng.latitude
    const centerLng = latlng.longitude

    // Create map with markers (using Google Maps Embed API)
    // Note: For multiple markers, we'd need to use Google Maps JavaScript API instead
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setMapUrl(null)
      return
    }
    
    const encodedCenter = `${centerLat},${centerLng}`
    setMapUrl(`https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${encodedCenter}&zoom=11`)

  }, [locations])

  const toggleFullscreen = () => {
    if (!mapRef.current) return
    
    if (!isFullscreen) {
      if (mapRef.current.requestFullscreen) {
        mapRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // Group locations by area/city for sidebar
  const groupedLocations = locations.reduce((acc, location) => {
    const address = location.address || ""
    const city = address.split(",").slice(-2)[0]?.trim() || "Unknown"
    
    if (!acc[city]) {
      acc[city] = []
    }
    acc[city].push(location)
    return acc
  }, {} as Record<string, GMBLocation[]>)

  if (locations.length === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardContent className="p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No locations available to display on map</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <Card className="bg-card border-primary/30 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Locations Map ({locations.length} locations)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="border-primary/30"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Fullscreen
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div 
            ref={mapRef}
            className="relative w-full h-[500px] bg-secondary/50"
          >
            {mapUrl ? (
              <iframe
                src={mapUrl}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            )}
            
            {/* Overlay with location markers */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {Object.entries(groupedLocations).map(([city, cityLocations]) => (
                <div key={city} className="bg-card/95 backdrop-blur-sm border border-primary/30 rounded-lg p-2 min-w-[200px]">
                  <p className="text-xs font-semibold text-foreground mb-1">{city}</p>
                  <div className="space-y-1">
                    {cityLocations.map((location) => {
                      const metadata = (location.metadata as any) || {}
                      const latlng = metadata.latlng || {}
                      const mapsUri = metadata.mapsUri
                      
                      return (
                        <button
                          key={location.id}
                          onClick={() => onLocationSelect?.(location)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            selectedLocation?.id === location.id
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate font-medium">{location.location_name}</span>
                            {(latlng.latitude || mapsUri) && (
                              <ExternalLink className="h-3 w-3 ml-1 shrink-0" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Details Panel */}
      {selectedLocation && (
        <Card className="bg-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">{selectedLocation.location_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedLocation.address && (
              <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
            )}
            {selectedLocation.phone && (
              <p className="text-sm text-muted-foreground">{selectedLocation.phone}</p>
            )}
            {selectedLocation.category && (
              <Badge variant="secondary" className="bg-secondary text-muted-foreground">
                {selectedLocation.category}
              </Badge>
            )}
            {(selectedLocation.metadata as any)?.mapsUri && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-primary/30"
                onClick={() => window.open((selectedLocation.metadata as any).mapsUri, '_blank')}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Open in Google Maps
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

