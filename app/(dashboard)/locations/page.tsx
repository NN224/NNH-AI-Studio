"use client"

import { useState, useEffect } from "react"
import { LocationCard } from "@/components/locations/location-card"
import { LocationFilters } from "@/components/locations/location-filters"
import { AddLocationDialog } from "@/components/locations/add-location-dialog"
import { createClient } from "@/lib/supabase/client"
import type { GMBLocation } from "@/lib/types/database"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { MapPin } from "lucide-react"

export default function LocationsPage() {
  const [locations, setLocations] = useState<GMBLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRating, setFilterRating] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from("gmb_locations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error('[Locations Page] Error fetching locations:', error)
          return
        }

        if (data) {
          setLocations(data)
        }
      } catch (error) {
        console.error('[Locations Page] Unexpected error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("gmb_locations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_locations",
        },
        () => {
          fetchLocations()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        location.location_name.toLowerCase().includes(query) ||
        location.address?.toLowerCase().includes(query) ||
        location.category?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Rating filter
    if (filterRating !== "all") {
      const minRating = Number.parseInt(filterRating)
      if (location.rating < minRating) return false
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active" && !location.is_active) return false
      if (filterStatus === "inactive" && location.is_active) return false
      if (filterStatus === "syncing" && !location.is_syncing) return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Locations</h1>
          <p className="text-muted-foreground mt-1">Manage your Google My Business locations</p>
        </div>
        <AddLocationDialog />
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

      {/* Locations Grid/List */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
          <LoadingSkeleton type="card" count={6} />
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No locations found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchQuery || filterRating !== "all" || filterStatus !== "all"
              ? "Try adjusting your filters to see more results"
              : "Get started by adding your first Google My Business location"}
          </p>
          {!searchQuery && filterRating === "all" && filterStatus === "all" && <AddLocationDialog />}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
          {filteredLocations.map((location, index) => (
            <LocationCard key={location.id} location={location} index={index} />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && filteredLocations.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredLocations.length} of {locations.length} location{locations.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
