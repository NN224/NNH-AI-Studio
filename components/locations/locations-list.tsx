"use client"

import { useState, useEffect } from "react"
import { LocationCard } from "./location-card"
import { LocationFilters } from "./location-filters"
import { AddLocationDialog } from "./add-location-dialog"
import { LocationsMapView } from "./locations-map-view"
import { Button } from "@/components/ui/button"
import { Plus, MapPin, BarChart3, TrendingUp, Eye, MousePointerClick } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import type { GMBLocation } from "@/lib/types/database"

export function LocationsList() {
  const [locations, setLocations] = useState<GMBLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid")
  const [overviewStats, setOverviewStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    avgRating: 0,
    totalReviews: 0,
  })
  const [selectedLocation, setSelectedLocation] = useState<GMBLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRating, setFilterRating] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchLocations() {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("Please sign in to view locations")
          setLoading(false)
          return
        }

        // First get active GMB account IDs
        const { data: activeAccounts } = await supabase
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)

        const activeAccountIds = activeAccounts?.map(acc => acc.id) || []

        // Only fetch locations from active accounts
        let data = null
        let fetchError = null
        
        if (activeAccountIds.length > 0) {
          const result = await supabase
            .from("gmb_locations")
            .select("*")
            .eq("user_id", user.id)
            .in("gmb_account_id", activeAccountIds)
            .order("created_at", { ascending: false })
          data = result.data
          fetchError = result.error
        } else {
          // No active accounts, return empty array
          data = []
        }

        if (fetchError) {
          throw fetchError
        }

        // Helper function to extract location ID number from location_id (normalize)
        const getLocationIdNumber = (locationId: string): string => {
          // Extract location ID number from formats like:
          // - "locations/11247391224469965786"
          // - "accounts/101323766532690204511/locations/11247391224469965786"
          const match = locationId.match(/locations\/([^\/]+)$/)
          return match ? match[1] : locationId
        }

        // Helper function to calculate metadata completeness score
        const getMetadataCompleteness = (location: GMBLocation): number => {
          const metadata = (location.metadata as any) || {}
          let score = 0
          
          // Profile description: +10 points
          if (metadata.profile?.description) score += 10
          
          // Regular hours: +10 points
          if (metadata.regularHours?.periods?.length > 0) score += 10
          
          // Service items: +5 points per item (max 20)
          if (metadata.serviceItems?.length > 0) {
            score += Math.min(metadata.serviceItems.length * 5, 20)
          }
          
          // Special hours: +5 points
          if (metadata.specialHours?.length > 0) score += 5
          
          // More hours: +5 points
          if (metadata.moreHours?.length > 0) score += 5
          
          // Open info: +5 points
          if (metadata.openInfo?.status) score += 5
          
          // Lat/Lng: +5 points
          if (metadata.latlng?.latitude && metadata.latlng?.longitude) score += 5
          
          // Labels: +2 points per label (max 10)
          if (metadata.labels?.length > 0) {
            score += Math.min(metadata.labels.length * 2, 10)
          }
          
          // Voice of Merchant: +10 points
          if (metadata.hasVoiceOfMerchant) score += 10
          
          // Place ID: +5 points
          if (metadata.placeId) score += 5
          
          // Maps URI: +5 points
          if (metadata.mapsUri) score += 5
          
          // Category: +3 points
          if (location.category) score += 3
          
          // Phone: +3 points
          if (location.phone) score += 3
          
          // Website: +3 points
          if (location.website) score += 3
          
          // Address: +3 points
          if (location.address) score += 3
          
          return score
        }

        // Remove duplicates based on location_id (normalized - extract location number only)
        // This handles cases where same location has different formats:
        // - "locations/11247391224469965786"
        // - "accounts/101323766532690204511/locations/11247391224469965786"
        const uniqueLocations = (data || []).reduce((acc: GMBLocation[], location: GMBLocation) => {
          // Normalize location_id to extract just the location number
          const locationIdNumber = getLocationIdNumber(location.location_id)
          
          // Check if we already have a location with the same normalized location_id
          const existingIndex = acc.findIndex(l => getLocationIdNumber(l.location_id) === locationIdNumber)
          
          if (existingIndex === -1) {
            // New unique location
            acc.push(location)
          } else {
            // Duplicate found - prefer the one with more complete metadata
            const existing = acc[existingIndex]
            const existingScore = getMetadataCompleteness(existing)
            const currentScore = getMetadataCompleteness(location)
            
            // If scores are equal, prefer the one with latest updated_at
            if (currentScore > existingScore) {
              // Current location has more complete metadata
              acc[existingIndex] = location
            } else if (currentScore === existingScore) {
              // Same completeness, prefer the one with latest updated_at
              const existingUpdated = existing.updated_at ? new Date(existing.updated_at).getTime() : 0
              const currentUpdated = location.updated_at ? new Date(location.updated_at).getTime() : 0
              
              if (currentUpdated > existingUpdated) {
                acc[existingIndex] = location
              }
            }
            // If existing has better score, keep it (no change)
          }
          
          return acc
        }, [])

        setLocations(uniqueLocations)
      } catch (err) {
        console.error("Error fetching locations:", err)
        setError(err instanceof Error ? err.message : "Failed to load locations")
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
    
    // Listen for sync completion event
    const handleSyncComplete = () => {
      console.log('[LocationsList] Sync completed, refreshing locations...')
      fetchLocations()
    }
    
    window.addEventListener('gmb-sync-complete', handleSyncComplete)
    
    return () => {
      window.removeEventListener('gmb-sync-complete', handleSyncComplete)
    }
  }, [])

  // Fetch overview stats
  useEffect(() => {
    async function fetchOverviewStats() {
      if (locations.length === 0) {
        setOverviewStats({
          totalImpressions: 0,
          totalClicks: 0,
          avgRating: 0,
          totalReviews: 0,
        })
        return
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          console.error("Authentication error in overview stats:", authError)
          return
        }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Get location IDs
        const locationIds = locations.map(loc => loc.id)
        
        if (locationIds.length === 0) {
          setOverviewStats({
            totalImpressions: 0,
            totalClicks: 0,
            avgRating: 0,
            totalReviews: 0,
          })
          return
        }

        // Get performance metrics with error handling
        const { data: metrics, error: metricsError } = await supabase
          .from("gmb_performance_metrics")
          .select("metric_type, metric_value, location_id")
          .eq("user_id", user.id)
          .in("location_id", locationIds)
          .gte("metric_date", thirtyDaysAgo.toISOString().split('T')[0])

        if (metricsError) {
          console.error("Error fetching metrics for overview:", metricsError)
          // Continue with calculations using empty metrics array
        }

        // Calculate totals safely
        const totalImpressions = (metrics || [])
          .filter(m => m.metric_type === 'QUERIES_DIRECT' || m.metric_type === 'QUERIES_INDIRECT')
          .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0)

        const totalClicks = (metrics || [])
          .filter(m => m.metric_type === 'ACTIONS_WEBSITE' || m.metric_type === 'ACTIONS_PHONE' || m.metric_type === 'ACTIONS_DRIVING_DIRECTIONS')
          .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0)

        // Calculate average rating with division by zero protection
        const ratings = locations.map(loc => Number(loc.rating) || 0).filter(r => r > 0)
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
          : 0

        // Total reviews
        const totalReviews = locations.reduce((sum, loc) => sum + (Number(loc.review_count) || 0), 0)

        setOverviewStats({
          totalImpressions,
          totalClicks,
          avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
          totalReviews,
        })
      } catch (error) {
        console.error("Error fetching overview stats:", error)
        // Set default stats on error
        setOverviewStats({
          totalImpressions: 0,
          totalClicks: 0,
          avgRating: 0,
          totalReviews: 0,
        })
      }
    }

    fetchOverviewStats()
  }, [locations, supabase])

  // Filter locations based on search and filters
  const filteredLocations = locations.filter((location) => {
    const matchesSearch = searchQuery === "" || 
      location.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.category?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRating = filterRating === "all" || 
      (filterRating === "5" && location.rating && location.rating >= 4.5) ||
      (filterRating === "4" && location.rating && location.rating >= 4 && location.rating < 4.5) ||
      (filterRating === "3" && location.rating && location.rating < 4)

    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "active" && location.is_active) ||
      (filterStatus === "inactive" && !location.is_active) ||
      (filterStatus === "syncing" && location.is_syncing)

    return matchesSearch && matchesRating && matchesStatus
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Locations</h2>
            <p className="text-muted-foreground">Manage your Google My Business locations</p>
          </div>
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <LoadingSkeleton type="card" count={6} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-red-500/30">
        <CardContent className="p-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <MapPin className="w-12 h-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Error Loading Locations</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
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
          <h2 className="text-2xl font-bold text-foreground">Locations</h2>
          <p className="text-muted-foreground">
            {locations.length} {locations.length === 1 ? "location" : "locations"} connected
          </p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <LocationFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterRating={filterRating}
        onFilterRatingChange={setFilterRating}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
      />

      {/* Empty State */}
      {filteredLocations.length === 0 && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {searchQuery || filterRating !== "all" || filterStatus !== "all" 
                    ? "No locations match your filters" 
                    : "No locations yet"}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {searchQuery || filterRating !== "all" || filterStatus !== "all"
                    ? "Try adjusting your filters or search query"
                    : "Add your first Google My Business location to start managing reviews and content"}
                </p>
              </div>
              {!searchQuery && filterRating === "all" && filterStatus === "all" && (
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  size="lg" 
                  className="mt-4 gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Location
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats Bar */}
      {filteredLocations.length > 0 && viewMode !== "map" && (
        <Card className="bg-card/50 border-primary/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Impressions</p>
                  <p className="text-lg font-semibold text-foreground">{overviewStats.totalImpressions.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Clicks</p>
                  <p className="text-lg font-semibold text-foreground">{overviewStats.totalClicks.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                  <p className="text-lg font-semibold text-foreground">{overviewStats.avgRating.toFixed(1)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Locations</p>
                  <p className="text-lg font-semibold text-foreground">{filteredLocations.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations Grid/List/Map */}
      {filteredLocations.length > 0 && (
        <>
          {viewMode === "map" ? (
            <LocationsMapView 
              locations={filteredLocations}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
            />
          ) : (
            <div className={viewMode === "grid" 
              ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
              : "space-y-4"
            }>
              {filteredLocations.map((location, index) => (
                <LocationCard key={location.id} location={location} index={index} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Location Dialog */}
      <AddLocationDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  )
}