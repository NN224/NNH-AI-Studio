"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Eye, MessageSquare, Zap, MapPin, Phone, Globe, Sparkles } from "lucide-react"
import type { GMBLocation } from "@/lib/types/database"
import Link from "next/link"

interface LocationCardProps {
  location: GMBLocation
  index: number
}

export function LocationCard({ location, index }: LocationCardProps) {
  return (
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
                {location.category && (
                  <Badge variant="secondary" className="mt-2 bg-secondary text-muted-foreground">
                    {location.category}
                  </Badge>
                )}
              </div>
            </div>

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
              <Link href={`/locations/${location.id}`}>
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
              <Link href={`/reviews?location=${location.id}`}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Reviews
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 bg-secondary hover:bg-primary/20 border border-primary/30 text-foreground"
            >
              <Zap className="w-4 h-4 mr-2" />
              AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
