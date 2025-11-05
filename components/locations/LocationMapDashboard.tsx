// src/components/locations/LocationMapDashboard.tsx

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox'; 
import { Filter, Search, Globe, Pin, RefreshCw, Loader2, Star, Send, Layers, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils'; 
import { toast } from 'sonner'; 
import Link from 'next/link'; 
import { useTheme } from 'next-themes'; // ⭐️ للاستفادة من الثيم الداكن للمستخدم

// تعريف نوع بيانات الموقع والمنافس (يجب أن يتطابق مع API)
interface LocationData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    rating: number;
    status: 'Verified' | 'Suspended' | 'Needs Attention';
}

interface CompetitorData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    rating: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 25.2048, 
  lng: 55.2708,
};

const libraries: ("places" | "drawing" | "geometry" | "visualization" | "marker")[] = ['places'];

// ⭐️ مصفوفة أنماط الخريطة الداكنة (Dark Map Theme)
const darkMapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#b3d4f8' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b3961' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#445b8a' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', stylers: [{ color: '#28385e' }] },
];


export function LocationMapDashboard() {
  const { theme } = useTheme(); 
  const [locationsData, setLocationsData] = useState<LocationData[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorData[]>([]); 
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false); 
  const [errorData, setErrorData] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMarker, setSelectedMarker] = useState<LocationData | CompetitorData | null>(null); 
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  
  // ✅ FIX: Memory leak prevention - track map instance and cleanup
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const isMountedRef = useRef(true); 


  // 1. تحميل سكربت الخريطة
  // ⚠️ SECURITY NOTE: Google Maps API key is exposed to client-side.
  // Must restrict API key in Google Cloud Console to specific referrers/domains only.
  // Consider implementing server-side proxy for production use.
  const { isLoaded, loadError: mapLoadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    libraries,
  });

  // ✅ FIX: Cleanup on unmount - Added comprehensive cleanup for Google Maps markers and InfoWindow instances to prevent memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Cleanup InfoWindow
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      
      // Cleanup all markers
      markersRef.current.forEach(marker => {
        marker.setMap(null);
        google.maps.event.clearInstanceListeners(marker);
      });
      markersRef.current = [];
      
      // Cleanup map instance
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current = null;
      }
    };
  }, []);

  // 2. دالة جلب بيانات المواقع
  const fetchMapData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoadingData(true);
    setErrorData(null);
    try {
      const response = await fetch('/api/locations/map-data');
      const data = await response.json();

      if (!isMountedRef.current) return;

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch location data');
      }

      setLocationsData(data);
      setSelectedLocations([]); 
    } catch (e: any) {
      if (!isMountedRef.current) return;
      console.error(e);
      setErrorData(e.message || 'Error fetching map data');
    } finally {
      if (isMountedRef.current) {
        setLoadingData(false);
      }
    }
  }, []);

  // 3. دالة جلب بيانات المنافسين
  const fetchCompetitorData = useCallback(async () => {
    if (!showCompetitors || !isMountedRef.current) {
      if (!showCompetitors) {
        setCompetitorData([]);
      }
      return;
    }
    
    setLoadingCompetitors(true);
    try {
        const response = await fetch('/api/locations/competitor-data');
        const data = await response.json();
        
        if (!isMountedRef.current) return;
        
        if (!response.ok) {
            // 💡 إظهار التنبيه للمستخدم إذا كان هناك خطأ في API Key/Restrictions
            if (data.error && data.error.includes('does not exist')) {
                toast.error("Database schema error (check 'type' column).");
            }
            throw new Error(data.error || data.message || 'Failed to fetch competitor data.');
        }
        setCompetitorData(data);
    } catch (e: any) {
        if (!isMountedRef.current) return;
        console.error('Competitor fetch failed:', e);
        toast.error(e.message || 'Failed to load competitor data. Check Places API permissions.');
        setShowCompetitors(false); 
    } finally {
        if (isMountedRef.current) {
            setLoadingCompetitors(false);
        }
    }
  }, [showCompetitors]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  useEffect(() => {
    // 💡 جلب بيانات المنافسين فقط عند تفعيل زر العرض
    fetchCompetitorData();
  }, [fetchCompetitorData, showCompetitors]); 

  // 4. تطبيق منطق التصفية والبحث
  const filteredLocations = useMemo(() => {
    return locationsData.filter(loc => {
      const statusMatch = selectedStatus === 'all' || loc.status === selectedStatus;
      const searchMatch = loc.name.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [selectedStatus, searchTerm, locationsData]);


  // دالة تبديل التحديد للمواقع
  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocations(prev => 
        prev.includes(locationId) 
            ? prev.filter(id => id !== locationId) 
            : [...prev, locationId]
    );
  };

  // دالة تحديد / إلغاء تحديد الكل للمواقع المُفلترة
  const toggleSelectAll = () => {
    const allFilteredIds = filteredLocations.map(loc => loc.id);
    const areAllSelected = allFilteredIds.every(id => selectedLocations.includes(id));

    if (areAllSelected) {
        const currentSelectionMinusFiltered = selectedLocations.filter(id => !allFilteredIds.includes(id));
        setSelectedLocations(currentSelectionMinusFiltered);
    } else {
        const currentSelectionMinusFiltered = selectedLocations.filter(id => !allFilteredIds.includes(id));
        setSelectedLocations([...currentSelectionMinusFiltered, ...allFilteredIds]);
    }
  };

  // دالة تنفيذ النشر الجماعي (Placeholder)
  const handleBulkPublish = async () => {
    if (selectedLocations.length === 0) {
        toast.error("Please select at least one location.");
        return;
    }

    const postIdToPublish = prompt("Enter the ID of the post you want to publish to all selected locations:");
    if (!postIdToPublish) return;

    setIsBulkProcessing(true);
    try {
        const response = await fetch('/api/locations/bulk-publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                locationIds: selectedLocations, 
                postId: postIdToPublish 
            }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            throw new Error(result.error || `Failed to publish to ${selectedLocations.length} locations.`);
        }

        toast.success(`Post published successfully to ${selectedLocations.length} locations!`);
        setSelectedLocations([]); 

    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsBulkProcessing(false);
    }
  };


  const getMarkerIcon = (status: LocationData['status']) => {
      switch (status) {
          case 'Suspended':
              return { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }; 
          case 'Needs Attention':
              return { url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' }; 
          case 'Verified':
          default:
              return { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }; 
      }
  };

  const getCompetitorIcon = () => {
    // لون أرجواني للمنافسين
    return { url: 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png' };
  };


  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={locationsData.length > 0 ? 11 : 4} 
      center={locationsData.length > 0 ? { lat: locationsData[0].lat, lng: locationsData[0].lng } : defaultCenter}
      options={{ 
          disableDefaultUI: true, 
          zoomControl: true,
          // ⭐️ تطبيق الثيم الداكن إذا كان مفعلاً
          styles: theme === 'dark' ? darkMapStyles : [] 
      }}
      onClick={() => setSelectedMarker(null)}
      onLoad={(map) => {
        // ✅ FIX: Store map instance for cleanup
        mapRef.current = map;
      }}
      onUnmount={() => {
        // ✅ FIX: Cleanup on unmount
        markersRef.current.forEach(marker => {
          if (marker) {
            marker.setMap(null);
          }
        });
        markersRef.current = [];
        mapRef.current = null;
      }}
    >
        {/* عرض نقاط المواقع الحقيقية */}
        {filteredLocations.map((loc) => (
            <Marker 
                key={loc.id} 
                position={{ lat: loc.lat, lng: loc.lng }} 
                title={loc.name}
                icon={getMarkerIcon(loc.status)}
                onClick={() => setSelectedMarker(loc)}
                onLoad={(marker) => {
                  // ✅ FIX: Track markers for cleanup
                  if (marker && !markersRef.current.includes(marker)) {
                    markersRef.current.push(marker);
                  }
                }}
                aria-label={`${loc.name}, Status: ${loc.status}, Rating: ${loc.rating}`}
            />
        ))}

        {/* ⭐️ عرض نقاط المنافسين (فقط إذا كانت showCompetitors مفعلة) ⭐️ */}
        {showCompetitors && competitorData.map((comp) => (
            <Marker 
                key={comp.id} 
                position={{ lat: comp.lat, lng: comp.lng }} 
                title={`Competitor: ${comp.name}`}
                icon={getCompetitorIcon()}
                onClick={() => setSelectedMarker(comp)}
                onLoad={(marker) => {
                  // ✅ FIX: Track markers for cleanup
                  if (marker && !markersRef.current.includes(marker)) {
                    markersRef.current.push(marker);
                  }
                }}
                aria-label={`Competitor: ${comp.name}, Rating: ${comp.rating}`}
            />
        ))}


        {/* نافذة المعلومات عند النقر على النقطة */}
        {selectedMarker && (
            <InfoWindow 
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => {
                  setSelectedMarker(null);
                  if (infoWindowRef.current) {
                    infoWindowRef.current = null;
                  }
                }}
                onLoad={(infoWindow) => {
                  // ✅ FIX: Track InfoWindow for cleanup
                  infoWindowRef.current = infoWindow;
                }}
                aria-label={`Information for ${selectedMarker.name}`}
            >
                <div className="p-2">
                    <h4 className="font-bold text-sm">
                        {'status' in selectedMarker ? selectedMarker.name : `Competitor: ${selectedMarker.name}`}
                    </h4>
                    <p className="text-xs flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-warning fill-warning" /> 
                        Rating: {selectedMarker.rating.toFixed(1) || 'N/A'}
                    </p>
                    {'status' in selectedMarker && (
                        <p className={cn("text-xs mt-1", 
                            selectedMarker.status === 'Suspended' ? 'text-destructive' : 
                            selectedMarker.status === 'Needs Attention' ? 'text-warning' : 
                            'text-success')}>
                            Status: {selectedMarker.status}
                        </p>
                    )}
                    <Button variant="link" size="sm" className="h-6 p-0 mt-2">
                        {'status' in selectedMarker ? 'View Details' : 'Analyze Competitor'}
                    </Button>
                </div>
            </InfoWindow>
        )}
    </GoogleMap>
  );

  // ✅ ACCESSIBILITY: Add proper ARIA labels and loading states
  if (mapLoadError) {
    return (
      <div 
        className="p-8 text-center text-destructive"
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle className="w-6 h-6 mx-auto mb-2" aria-hidden="true" />
        <p>Error loading maps. Check your API key.</p>
      </div>
    );
  }
  
  if (!isLoaded) {
    return (
      <div 
        className="p-8 text-center text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading map"
      >
        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" aria-hidden="true" />
        <p>Loading Map...</p>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ⭐️ الجزء الأيسر: عناصر التحكم والفلاتر والإجراءات الجماعية ⭐️ */}
      <Card className="lg:col-span-1 border border-primary/20">
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle className="text-lg flex items-center gap-2"><Layers className="w-5 h-5"/> Location Actions & View</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchMapData} disabled={loadingData}>
            <RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* شريط الإجراءات الجماعية (يظهر عند التحديد) */}
          {selectedLocations.length > 0 && (
            <Card className="p-3 border-2 border-primary/50 bg-primary/10 transition-all">
                <p className="text-sm font-semibold mb-2">{selectedLocations.length} Locations Selected</p>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        size="sm" 
                        className="gap-1" 
                        onClick={handleBulkPublish}
                        disabled={isBulkProcessing}
                    >
                        {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Bulk Publish Post
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setSelectedLocations([])}
                        disabled={isBulkProcessing}
                    >
                        Cancel
                    </Button>
                </div>
            </Card>
          )}

          {/* شريط البحث */}
          <div className="space-y-2">
            <label 
              htmlFor="location-search"
              className="text-sm font-medium flex items-center gap-1"
            >
              <Search className="w-4 h-4" aria-hidden="true"/> 
              Search Location
            </label>
            <Input 
                id="location-search"
                placeholder="Search by name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loadingData}
                aria-label="Search locations by name"
                aria-describedby="location-search-hint"
            />
            <p id="location-search-hint" className="text-xs text-muted-foreground sr-only">
              Type to filter locations by name
            </p>
          </div>

          {/* فلتر الحالة */}
          <div className="space-y-2">
            <label 
              htmlFor="status-filter"
              className="text-sm font-medium flex items-center gap-1"
            >
              <Pin className="w-4 h-4" aria-hidden="true"/> 
              Location Status
            </label>
            <Select 
              onValueChange={setSelectedStatus} 
              value={selectedStatus} 
              disabled={loadingData}
            >
              <SelectTrigger 
                id="status-filter"
                aria-label="Filter locations by status"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations ({locationsData.length})</SelectItem>
                <SelectItem value="Verified">✅ Verified</SelectItem>
                <SelectItem value="Needs Attention">⚠️ Needs Attention</SelectItem>
                <SelectItem value="Suspended">❌ Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ⭐️ زر عرض طبقة المنافسة (تم تفعيله) ⭐️ */}
          <Button 
            variant={showCompetitors ? "default" : "outline"}
            className="w-full gap-2 mt-4" 
            onClick={() => setShowCompetitors(!showCompetitors)}
            disabled={loadingCompetitors} 
          >
            {loadingCompetitors ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Globe className="w-4 h-4" />
            )}
            {showCompetitors ? 'Hide Competitors' : `Show Competitors (${competitorData.length})`}
          </Button>

          {/* ⭐️ لوحة التنبيهات الجغرافية (Geo-Alerts) - الميزة المساعدة الجديدة ⭐️ */}
          <Card className="border border-warning/30 bg-warning/10 mt-4 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-warning flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Geo-Alerts
            </h4>
            {filteredLocations.filter(l => l.status === 'Needs Attention').length > 0 && (
                <p className="text-xs text-foreground">
                    ⚠️ {filteredLocations.filter(l => l.status === 'Needs Attention').length} locations require immediate review or posting.
                </p>
            )}
            {competitorData.length > 0 && (
                <p className="text-xs text-foreground">
                    🔎 Found {competitorData.length} active competitors in your area.
                </p>
            )}
            {filteredLocations.length > 0 && (
                <p className="text-xs text-foreground">
                    <Sparkles className="w-3 h-3 inline mr-1 text-primary"/> AI suggests targeting the 'Dubai Marina' grid area next.
                </p>
            )}
            {filteredLocations.length === 0 && (
                 <p className="text-xs text-muted-foreground">No critical alerts detected.</p>
            )}
          </Card>


          {/* قائمة المواقع الناتجة */}
          <div className="pt-4">
            <h3 className="text-md font-semibold mb-3">Filtered Results ({filteredLocations.length})</h3>

            {/* زر تحديد/إلغاء تحديد الكل */}
            {filteredLocations.length > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                        id="selectAll"
                        checked={filteredLocations.every(loc => selectedLocations.includes(loc.id))}
                        onCheckedChange={toggleSelectAll}
                    />
                    <label
                        htmlFor="selectAll"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Select All ({filteredLocations.length})
                    </label>
                </div>
            )}

            {loadingData ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading locations...</div>
            ) : errorData ? (
                <div className="text-sm text-destructive">Error: {errorData}</div>
            ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredLocations.length === 0 ? (
                         <div className="text-sm text-muted-foreground">No locations match your filters.</div>
                    ) : (
                        filteredLocations.map(loc => (
                            <div 
                                key={loc.id} 
                                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer flex justify-between items-center"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Checkbox لتحديد الموقع */}
                                    <Checkbox 
                                        checked={selectedLocations.includes(loc.id)} 
                                        onCheckedChange={() => toggleLocationSelection(loc.id)}
                                        onClick={(e) => e.stopPropagation()} 
                                    />
                                    <div onClick={() => setSelectedMarker(loc)}>
                                        <p className="font-medium text-sm">{loc.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Star className="w-3 h-3 text-warning fill-warning" />
                                            {loc.rating.toFixed(1) || 'N/A'} ({loc.status})
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedMarker(loc)}>View</Button>
                            </div>
                        ))
                    )}
                </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* ⭐️ الجزء الأيمن: الخريطة التفاعلية */}
      <div className="lg:col-span-2">
        <Card className="border border-primary/20 p-0 overflow-hidden">
          {renderMap()}
        </Card>
      </div>

    </div>
  );
}