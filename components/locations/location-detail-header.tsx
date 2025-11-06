"use client";

import React, { useState } from 'react';
import { useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Edit, 
  RefreshCw, 
  MoreVertical, 
  MapPin, 
  Phone, 
  Globe,
  Star,
  ExternalLink,
  Trash2,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getHealthScoreColor, getStatusColor } from '@/components/locations/location-types';
import { formatLargeNumber } from '@/components/locations/location-types';

interface LocationDetailHeaderProps {
  location: any;
  locationId: string;
  metadata: any;
  onRefresh: () => void;
  gmbAccountId?: string; // Optional: pass accountId if available
}

export function LocationDetailHeader({ 
  location, 
  locationId, 
  metadata,
  onRefresh,
  gmbAccountId
}: LocationDetailHeaderProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(gmbAccountId || null);

  // Fetch accountId if not provided
  React.useEffect(() => {
    if (accountId) return; // Already have accountId
    
    const fetchAccountId = async () => {
      try {
        // Try to get accountId from location detail API
        const res = await fetch(`/api/gmb/location/${locationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.gmb_account_id) {
            setAccountId(data.gmb_account_id);
            return;
          }
        }
        
        // Fallback: get first active account
        const accountsRes = await fetch('/api/gmb/accounts');
        const accountsData = await accountsRes.json();
        if (accountsData && accountsData.length > 0) {
          const activeAccount = accountsData.find((acc: any) => acc.is_active) || accountsData[0];
          if (activeAccount?.id) {
            setAccountId(activeAccount.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch accountId:', error);
      }
    };

    fetchAccountId();
  }, [locationId, accountId]);

  const name = location?.name || location?.title || 'Unnamed Location';
  const address = location?.storefrontAddress?.addressLines?.[0] || 
                 location?.address || 
                 metadata?.address || 
                 'N/A';
  const phone = location?.phoneNumbers?.primaryPhoneNumber?.phoneNumber || 
                location?.phone || 
                metadata?.phone || 
                null;
  const website = location?.websiteUri || location?.website || metadata?.website || null;
  const rating = location?.rating || metadata?.rating || 0;
  const reviewCount = location?.reviewCount || metadata?.reviewCount || 0;
  const healthScore = metadata?.healthScore || metadata?.health_score || 0;
  const status = location?.status || metadata?.status || 'verified';
  const isOpen = location?.openInfo?.status === 'OPEN' || metadata?.isOpen;

  const handleSync = async () => {
    if (!accountId) {
      toast.error('No GMB account found. Please connect a GMB account first.');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: accountId,
          sync_type: 'location',
          location_id: locationId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Sync failed');
      }

      toast.success('Location synced successfully!');
      onRefresh();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync location');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/locations?id=${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast.success('Location deleted successfully');
      router.push('/locations');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete location');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/locations')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Locations
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/locations/${locationId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Google Maps
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/locations/${locationId}/settings`)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete Location'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Location Info Card */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              {/* Name & Status */}
              <div>
                <h1 className="text-3xl font-bold mb-2">{name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(status)}>
                    {status}
                  </Badge>
                  {isOpen && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Open Now
                    </Badge>
                  )}
                  {healthScore > 0 && (
                    <Badge 
                      variant="secondary"
                      className={getHealthScoreColor(healthScore)}
                    >
                      Health: {healthScore}%
                    </Badge>
                  )}
                </div>
              </div>

              {/* Address & Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {address && address !== 'N/A' && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{address}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={`tel:${phone}`} 
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {phone}
                    </a>
                  </div>
                )}
                {website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary truncate"
                    >
                      {website}
                    </a>
                  </div>
                )}
              </div>

              {/* Rating & Reviews */}
              {(rating > 0 || reviewCount > 0) && (
                <div className="flex items-center gap-4 pt-2 border-t">
                  {rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold">{rating.toFixed(1)}</span>
                    </div>
                  )}
                  {reviewCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {formatLargeNumber(reviewCount)} {reviewCount === 1 ? 'review' : 'reviews'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
