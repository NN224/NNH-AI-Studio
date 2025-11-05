"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Star, 
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getHealthScoreBreakdown } from '@/components/locations/location-types';
import { Location } from '@/components/locations/location-types';

interface LocationOverviewSectionProps {
  location: any;
  metadata: any;
  attributes: any[];
  googleUpdated: any;
}

export function LocationOverviewSection({ 
  location, 
  metadata, 
  attributes,
  googleUpdated 
}: LocationOverviewSectionProps) {
  const address = location?.storefrontAddress || location?.address || {};
  const phone = location?.phoneNumbers?.primaryPhoneNumber?.phoneNumber || location?.phone;
  const website = location?.websiteUri || location?.website;
  const hours = location?.regularHours || metadata?.regularHours || {};
  const categories = location?.categories || metadata?.categories || [];
  const serviceItems = location?.serviceItems || metadata?.serviceItems || [];
  const healthScore = metadata?.healthScore || metadata?.health_score || 0;

  // Convert to Location type for health score breakdown
  const locationForHealth: Location = {
    id: location?.name || '',
    name: location?.name || location?.title || '',
    address: Array.isArray(address?.addressLines) ? address.addressLines.join(', ') : address,
    phone: phone,
    website: website,
    rating: location?.rating || metadata?.rating || 0,
    reviewCount: location?.reviewCount || metadata?.reviewCount || 0,
    status: location?.status || 'verified',
    category: categories[0]?.displayName || categories[0]?.categoryId,
    healthScore: healthScore,
    hours: hours,
    attributes: serviceItems,
  };

  const healthBreakdown = getHealthScoreBreakdown(locationForHealth);

  // Format business hours
  const formatHours = () => {
    if (!hours?.periods || !Array.isArray(hours.periods)) {
      return 'Hours not available';
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return hours.periods.map((period: any, index: number) => {
      const dayName = days[period.openDay] || `Day ${period.openDay}`;
      const openTime = period.openTime?.hours?.toString().padStart(2, '0') + ':' + 
                      period.openTime?.minutes?.toString().padStart(2, '0');
      const closeTime = period.closeTime?.hours?.toString().padStart(2, '0') + ':' + 
                       period.closeTime?.minutes?.toString().padStart(2, '0');
      return `${dayName}: ${openTime} - ${closeTime}`;
    }).join('\n');
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Address</p>
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(address?.addressLines) 
                    ? address.addressLines.join(', ')
                    : address
                  }
                </p>
              </div>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Phone</p>
                <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-primary">
                  {phone}
                </a>
              </div>
            </div>
          )}

          {website && (
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Website</p>
                <a 
                  href={website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary truncate block"
                >
                  {website}
                </a>
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {cat.displayName || cat.categoryId || cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {hours?.periods && hours.periods.length > 0 ? (
            <div className="space-y-2">
              <pre className="text-sm text-muted-foreground font-sans whitespace-pre-wrap">
                {formatHours()}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hours not available</p>
          )}
        </CardContent>
      </Card>

      {/* Health Score Breakdown */}
      {healthScore > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Health Score Breakdown
              </CardTitle>
              <Badge variant="secondary" className="text-lg">
                {healthBreakdown.completionPercentage}% Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {healthBreakdown.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border
                      ${item.complete 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-muted border-border'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg
                      ${item.complete 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-muted'
                      }
                    `}>
                      <Icon className={`
                        w-4 h-4
                        ${item.complete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
                      `} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {item.key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                    {item.complete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Items / Attributes */}
      {serviceItems.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Service Items & Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {serviceItems.map((item: any, index: number) => (
                <Badge key={index} variant="outline">
                  {item.displayName || item.serviceTypeId || item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Updated Info */}
      {googleUpdated && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Google Updated Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This location has information updated by Google. Some details may differ from your business information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
