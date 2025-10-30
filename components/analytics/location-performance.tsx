"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { GMBLocationWithRating } from "@/lib/types/database"

export function LocationPerformance() {
  const [locations, setLocations] = useState<GMBLocationWithRating[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data } = await supabase
          .from("gmb_locations_with_rating")
          .select("*")
          .order("rating", { ascending: false })
          .limit(4)

        if (data) {
          setLocations(data)
        }
      } catch (error) {
        console.error("Error fetching locations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocations()

    const channel = supabase
      .channel("location-performance")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_locations" }, fetchLocations)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_reviews" }, fetchLocations)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Top Performing Locations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-secondary animate-pulse rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Top Performing Locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No locations found</p>
        ) : (
          locations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary border border-primary/20 hover:border-primary/40 transition-all duration-200"
            >
              <div className="flex-1">
                <p className="font-semibold text-foreground">{location.location_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {location.rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{location.reviews_count || 0} reviews</span>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />+{Math.floor(Math.random() * 20)}%
              </Badge>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
