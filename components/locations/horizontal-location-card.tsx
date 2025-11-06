"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Location } from '@/components/locations/location-types';
import { getHealthScoreColor, formatLargeNumber } from '@/components/locations/location-types';
import { Phone, MapPin, Eye, Settings, ExternalLink } from 'lucide-react';

interface HorizontalLocationCardProps {
  location: Location;
  onViewDetails?: (id: string) => void;
}

export function HorizontalLocationCard({ location, onViewDetails }: HorizontalLocationCardProps) {
  const router = useRouter();
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Fetch media for cover/logo photos
  useEffect(() => {
    async function fetchLocationMedia() {
      try {
        setLoadingMedia(true);
        const response = await fetch(`/api/gmb/media?locationId=${location.id}`);
        
        if (!response.ok) {
          return;
        }
        
        const result = await response.json();
        
        if (result.data?.media) {
          const media = result.data.media;
          let foundCover = false;
          let foundLogo = false;
          
          media.forEach((item: any) => {
            const category = item.locationAssociation?.category || 
                           item.metadata?.locationAssociation?.category ||
                           item.metadata?.category ||
                           item.category;
            const url = item.sourceUrl || item.googleUrl || item.url || item.thumbnailUrl;
            
            if (!url) return;
            
            if (category === 'COVER' && !foundCover) {
              foundCover = true;
              setCoverPhoto(url);
            } else if (category === 'LOGO' && !foundLogo) {
              foundLogo = true;
              setLogoPhoto(url);
            }
          });
          
          // If no categorized media found, use first photo as cover
          if (!foundCover && media.length > 0) {
            const firstPhoto = media.find((m: any) => 
              (m.mediaFormat !== 'VIDEO' && m.type !== 'VIDEO') && 
              (m.sourceUrl || m.googleUrl || m.url || m.thumbnailUrl)
            );
            if (firstPhoto) {
              const photoUrl = firstPhoto.sourceUrl || firstPhoto.googleUrl || firstPhoto.url || firstPhoto.thumbnailUrl;
              setCoverPhoto(photoUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching location media:', error);
      } finally {
        setLoadingMedia(false);
      }
    }

    fetchLocationMedia();
  }, [location.id]);

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(location.id);
    } else {
      router.push(`/locations/${location.id}`);
    }
  };

  const handleCall = () => {
    if (location.phone) {
      window.location.href = `tel:${location.phone}`;
    }
  };

  const handleDirections = () => {
    if (location.coordinates) {
      const { lat, lng } = location.coordinates;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (location.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`, '_blank');
    }
  };

  const healthColor = location.healthScore !== undefined
    ? getHealthColor(location.healthScore)
    : 'gray';

  return (
    <div className="
      flex flex-col md:flex-row gap-6
      p-6
      bg-black/40 backdrop-blur-xl
      border border-orange-500/30 rounded-2xl
      transition-all duration-300
      hover:translate-y-[-4px]
      hover:border-orange-500/60
      hover:shadow-[0_8px_32px_rgba(255,127,0,0.2)]
    ">
      {/* Left Side: Cover Image with Logo */}
      <div className="relative w-full md:w-[200px] h-[150px] md:h-[150px] flex-shrink-0 rounded-xl overflow-hidden">
        {/* Cover Image */}
        {coverPhoto ? (
          <img 
            src={coverPhoto} 
            alt={location.name}
            className="w-full h-full object-cover"
            onError={() => setCoverPhoto(null)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600" />
        )}
        
        {/* Logo Overlay */}
        <div className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full border-[3px] border-black bg-white overflow-hidden shadow-lg">
          {logoPhoto ? (
            <img 
              src={logoPhoto} 
              alt="Logo"
              className="w-full h-full object-cover"
              onError={() => setLogoPhoto(null)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
              {location.name[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
      
      {/* Right Side: Content */}
      <div className="flex-1 flex flex-col gap-3 pt-2">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-xl font-semibold text-white m-0">{location.name}</h3>
          {location.status === 'verified' && (
            <Badge className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-500 text-xs rounded-full">
              ✓ Verified
            </Badge>
          )}
          {location.category && (
            <Badge variant="outline" className="text-xs">
              {location.category}
            </Badge>
          )}
        </div>
        
        {/* Address */}
        {location.address && (
          <p className="text-sm text-gray-400 m-0 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {location.address}
          </p>
        )}
        
        {/* Stats Row */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          {location.rating !== undefined && (
            <span className="text-white flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              {location.rating.toFixed(1)}
              {location.reviewCount !== undefined && (
                <span className="text-gray-400 ml-1">
                  ({formatLargeNumber(location.reviewCount)} reviews)
                </span>
              )}
            </span>
          )}
          {location.rating !== undefined && location.healthScore !== undefined && (
            <span className="text-gray-500">•</span>
          )}
          {location.healthScore !== undefined && (
            <span className={`font-medium ${getHealthScoreColor(location.healthScore)}`}>
              💚 Health: {location.healthScore}%
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-auto flex-wrap">
          {location.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCall}
              className="bg-white/5 border-orange-500/30 text-white hover:bg-orange-500/10 hover:border-orange-500/50"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
          )}
          {(location.coordinates || location.address) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDirections}
              className="bg-white/5 border-orange-500/30 text-white hover:bg-orange-500/10 hover:border-orange-500/50"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Directions
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="bg-orange-500/20 border-orange-500/50 text-white hover:bg-orange-500/30"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/locations/${location.id}/edit`)}
            className="bg-white/5 border-orange-500/30 text-white hover:bg-orange-500/10 hover:border-orange-500/50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

function getHealthColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

