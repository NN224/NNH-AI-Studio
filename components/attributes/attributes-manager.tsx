"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Tags, Loader2, Settings, MapPin } from "lucide-react"
import { toast } from "sonner"
import { LocationAttributesDialog } from "@/components/locations/location-attributes-dialog"
import type { GMBLocation } from "@/lib/types/database"

export function AttributesManager() {
  const [locations, setLocations] = useState<GMBLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<GMBLocation | null>(null)
  const [attributesDialogOpen, setAttributesDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError("Unauthorized")
        setLoading(false)
        return
      }

      // First get active GMB account IDs
      const { data: activeAccounts, error: accountsError } = await supabase
        .from("gmb_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (accountsError) {
        console.error("Error fetching active accounts:", accountsError)
        throw accountsError
      }

      const activeAccountIds = activeAccounts?.map(acc => acc.id) || []

      if (activeAccountIds.length === 0) {
        setLocations([])
        setLoading(false)
        return
      }

      // Only fetch locations from active accounts
      const { data, error: locationsError } = await supabase
        .from("gmb_locations")
        .select("*")
        .eq("user_id", user.id)
        .in("gmb_account_id", activeAccountIds)
        .order("location_name", { ascending: true })

      if (locationsError) throw locationsError
      setLocations(data || [])
    } catch (err: any) {
      console.error("Error fetching locations:", err)
      const errorMessage = err.message || "Failed to fetch locations"
      setError(errorMessage)
      setLocations([]) // Set empty array on error
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleManageAttributes = (location: GMBLocation) => {
    setSelectedLocation(location)
    setAttributesDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-primary/30">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchLocations} className="mt-4" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Location Attributes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage attributes for all your business locations
          </p>
        </div>
      </div>

      {locations.length === 0 ? (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-12 text-center">
            <Tags className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Locations Found
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your Google My Business account to start managing location attributes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id} className="bg-card border-primary/30 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {location.location_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {location.category || "No category"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-foreground text-right max-w-[200px] truncate">
                      {location.address || "N/A"}
                    </span>
                  </div>
                  {location.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="text-foreground">{location.phone}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => handleManageAttributes(location)}
                    className="w-full mt-4 bg-primary hover:bg-primary/90"
                    variant="default"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Attributes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedLocation && (
        <LocationAttributesDialog
          location={selectedLocation}
          open={attributesDialogOpen}
          onOpenChange={(open) => {
            setAttributesDialogOpen(open)
            if (!open) {
              setSelectedLocation(null)
            }
          }}
          onSuccess={() => {
            fetchLocations()
            toast.success("Attributes updated successfully")
          }}
        />
      )}
    </div>
  )
}

