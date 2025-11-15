'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Star, ArrowRight, Building2 } from 'lucide-react'

interface Location {
  id: string
  location_name: string
  address?: string
  is_active: boolean
  rating?: number
  review_count?: number
  status?: 'verified' | 'pending' | 'suspended'
}

interface LocationsWidgetProps {
  locations: Location[]
}

function LocationItem({ location }: { location: Location }) {
  const statusConfig = {
    verified: { variant: 'default' as const, label: 'Active' },
    pending: { variant: 'secondary' as const, label: 'Pending' },
    suspended: { variant: 'destructive' as const, label: 'Suspended' },
  }

  const status = location.status || (location.is_active ? 'verified' : 'suspended')
  const statusInfo = statusConfig[status]

  return (
    <Link
      href={`/dashboard/locations/${location.id}`}
      className="block border-b last:border-0 pb-3 last:pb-0 hover:bg-accent/50 transition-colors rounded-md px-2 -mx-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">
              {location.location_name}
            </h4>
            <Badge variant={statusInfo.variant} className="text-xs shrink-0">
              {statusInfo.label}
            </Badge>
          </div>
          
          {location.address && (
            <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {location.address}
            </p>
          )}
          
          {location.rating !== undefined && location.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">
                {Number(location.rating).toFixed(1)}
              </span>
              {location.review_count !== undefined && location.review_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({location.review_count} reviews)
                </span>
              )}
            </div>
          )}
        </div>
        
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </Link>
  )
}

export function LocationsWidget({ locations }: LocationsWidgetProps) {
  if (locations.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Business Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            No locations found
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Connect your Google Business account to see your locations
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/sync">
              Sync Locations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Business Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {locations.map((location) => (
          <LocationItem key={location.id} location={location} />
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard/locations">
            View All Locations
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

