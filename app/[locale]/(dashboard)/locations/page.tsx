'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
MapPin, Star, Phone, Globe, Clock, Users, TrendingUp, TrendingDown,
Search, Filter, Plus, Edit3, Shield, AlertTriangle, CheckCircle,
BarChart3, Eye, MessageSquare, Calendar, Camera, Settings,
Navigation, Wifi, Car, CreditCard, Utensils, ShoppingBag,
Loader2, RefreshCw, ExternalLink, Copy, QrCode, Layers, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/lib/navigation';

// Types (تم الاحتفاظ بالواجهات كما هي)
interface Location {
id: string;
name: string;
address: string;
phone: string;
website: string;
rating: number;
reviewCount: number;
status: 'verified' | 'pending' | 'suspended';
category: string;
coordinates: { lat: number; lng: number };
hours: BusinessHours;
attributes: string[];
photos: number;
posts: number;
healthScore: number;
visibility: number;
lastSync: Date;
insights: LocationInsights;
}

interface BusinessHours {
monday: string;
tuesday: string;
wednesday: string;
thursday: string;
friday: string;
saturday: string;
sunday: string;
}

interface LocationInsights {
views: number;
viewsTrend: number;
clicks: number;
clicksTrend: number;
calls: number;
callsTrend: number;
directions: number;
directionsTrend: number;
weeklyGrowth: number;
}

// Helper function to format large numbers
const formatLargeNumber = (num: number) => {
if (num >= 1000) {
return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
}
return num.toString();
};


// Location Card Component
const LocationCard = ({ location, onEdit, onViewDetails }: {
location: Location;
onEdit: (id: string) => void;
onViewDetails: (id: string) => void;
}) => {
const getStatusColor = (status: string) => {
switch (status) {
case 'verified': return 'bg-green-500/20 text-green-700 border-green-500/50';
case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
case 'suspended': return 'bg-red-500/20 text-red-700 border-red-500/50';
default: return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
}
};

const getHealthScoreColor = (score: number) => {
if (score >= 80) return 'text-green-500';
if (score >= 60) return 'text-yellow-500';
return 'text-red-500';
};

const getTrendColor = (trend: number) => {
if (trend > 0) return 'text-green-500';
if (trend < 0) return 'text-red-500';
return 'text-muted-foreground';
};

return (
<Card className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
<CardHeader className="pb-3">
<div className="flex items-start justify-between">
<div className="flex-1">
<div className="flex items-center gap-2 mb-2">
<h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
{location.name}
</h3>
<Badge className={`text-xs border ${getStatusColor(location.status)}`}>
{location.status}
</Badge>
</div>
<div className="flex items-center gap-4 text-sm text-muted-foreground">
<div className="flex items-center gap-1">
<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
<span className="font-medium text-foreground">{location.rating.toFixed(1)}</span>
<span>({formatLargeNumber(location.reviewCount)})</span>
</div>
<div className="flex items-center gap-1">
<MapPin className="w-4 h-4" />
<span className="truncate max-w-[150px]">{location.address.split(',')[0]}</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<Button size="sm" variant="ghost" onClick={() => onEdit(location.id)}>
<Edit3 className="w-4 h-4" />
</Button>
<Button size="sm" variant="ghost" onClick={() => onViewDetails(location.id)}>
<Eye className="w-4 h-4" />
</Button>
</div>
</div>
</CardHeader>

<CardContent className="space-y-4">
{/* Health Score - GMB Command Center Integration */}
<div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-primary/20">
<span className="text-sm font-medium flex items-center gap-1"><Shield className="w-4 h-4 text-primary" /> Health Score</span>
<span className={`text-xl font-bold ${getHealthScoreColor(location.healthScore)}`}>
{location.healthScore}%
</span>
</div>

{/* Quick Stats */}
<div className="grid grid-cols-3 gap-4">
<div className="text-center p-2 rounded-lg border border-muted">
<div className="text-base font-bold text-foreground">{formatLargeNumber(location.insights.views)}</div>
<div className="text-xs text-muted-foreground">Views</div>
<div className="flex items-center justify-center gap-1 text-xs">
{location.insights.viewsTrend > 0 ? (
<TrendingUp className={`w-3 h-3 ${getTrendColor(location.insights.viewsTrend)}`} />
) : (
<TrendingDown className={`w-3 h-3 ${getTrendColor(location.insights.viewsTrend)}`} />
)}
<span className={getTrendColor(location.insights.viewsTrend)}>
{Math.abs(location.insights.viewsTrend)}%
</span>
</div>
</div>

<div className="text-center p-2 rounded-lg border border-muted">
<div className="text-base font-bold text-foreground">{formatLargeNumber(location.insights.clicks)}</div>
<div className="text-xs text-muted-foreground">Clicks</div>
<div className="flex items-center justify-center gap-1 text-xs">
{location.insights.clicksTrend > 0 ? (
<TrendingUp className={`w-3 h-3 ${getTrendColor(location.insights.clicksTrend)}`} />
) : (
<TrendingDown className={`w-3 h-3 ${getTrendColor(location.insights.clicksTrend)}`} />
)}
<span className={getTrendColor(location.insights.clicksTrend)}>
{Math.abs(location.insights.clicksTrend)}%
</span>
</div>
</div>

<div className="text-center p-2 rounded-lg border border-muted">
<div className="text-base font-bold text-foreground">{formatLargeNumber(location.insights.calls)}</div>
<div className="text-xs text-muted-foreground">Calls</div>
<div className="flex items-center justify-center gap-1 text-xs">
{location.insights.callsTrend > 0 ? (
<TrendingUp className={`w-3 h-3 ${getTrendColor(location.insights.callsTrend)}`} />
) : (
<TrendingDown className={`w-3 h-3 ${getTrendColor(location.insights.callsTrend)}`} />
)}
<span className={getTrendColor(location.insights.callsTrend)}>
{Math.abs(location.insights.callsTrend)}%
</span>
</div>
</div>
</div>

{/* Attributes */}
<div className="flex flex-wrap gap-1">
{location.attributes.slice(0, 3).map((attr, index) => (
<Badge key={index} variant="secondary" className="text-xs">
{attr}
</Badge>
))}
{location.attributes.length > 3 && (
<Badge variant="secondary" className="text-xs">
+{location.attributes.length - 3} more
</Badge>
)}
</div>

{/* Action Buttons */}
<div className="flex gap-2 pt-2">
<Button size="sm" variant="outline" className="flex-1" asChild>
<Link href={`/reviews?location=${location.id}`}>
<MessageSquare className="w-4 h-4 mr-1" />
Reviews ({formatLargeNumber(location.reviewCount)})
</Link>
</Button>
<Button size="sm" variant="outline" className="flex-1" asChild>
<Link href={`/analytics?location=${location.id}`}>
<BarChart3 className="w-4 h-4 mr-1" />
Insights
</Link>
</Button>
</div>

{/* Last Sync */}
<div className="text-xs text-muted-foreground text-center pt-2 border-t">
Last sync: {location.lastSync.toLocaleTimeString()}
</div>
</CardContent>
</Card>
);
};

// Main Locations Page
export default function LocationsPage() {
const supabase = createClient();
const [locations, setLocations] = useState<Location[]>([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [selectedStatus, setSelectedStatus] = useState<string>('all');
const [selectedCategory, setSelectedCategory] = useState<string>('all');
const [syncing, setSyncing] = useState(false);
const router = useRouter();

// ⭐️ استبدال البيانات الوهمية بمنطق جلب API
const fetchLocations = async () => {
try {
setLoading(true);
      const res = await fetch('/api/locations/list-data');
      const data = await res.json();

      if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch locations list.');
      }

      // 💡 يجب تحويل تاريخ lastSync من string إلى Date object بعد الجلب
      const processedData = data.map((loc: any) => ({
          ...loc,
          lastSync: new Date(loc.lastSync),
          // تحويل جميع الأرقام إلى أرقام إذا لزم الأمر
          rating: parseFloat(loc.rating) || 0,
          healthScore: parseInt(loc.healthScore) || 0,
          reviewCount: parseInt(loc.reviewCount) || 0,
      }));

setLocations(processedData);
} catch (error) {
console.error('Failed to fetch locations:', error);
toast.error('Failed to load locations');
} finally {
setLoading(false);
}
};

useEffect(() => {
fetchLocations();
}, []);

const handleSync = async () => {
try {
setSyncing(true);
// Replace with real sync API call
await new Promise(resolve => setTimeout(resolve, 2000));
await fetchLocations();
toast.success('Locations synced successfully!');
} catch (error) {
toast.error('Failed to sync locations');
} finally {
setSyncing(false);
}
};

const filteredLocations = locations.filter(location => {
const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
location.address.toLowerCase().includes(searchTerm.toLowerCase());
const matchesStatus = selectedStatus === 'all' || location.status === selectedStatus;
const matchesCategory = selectedCategory === 'all' || location.category === selectedCategory;

return matchesSearch && matchesStatus && matchesCategory;
});

const getOverallStats = () => {
const totalViews = locations.reduce((sum, loc) => sum + loc.insights.views, 0);
const totalClicks = locations.reduce((sum, loc) => sum + loc.insights.clicks, 0);
const avgRating = locations.length > 0 ? locations.reduce((sum, loc) => sum + loc.rating, 0) / locations.length : 0;
const avgHealthScore = locations.length > 0 ? locations.reduce((sum, loc) => sum + loc.healthScore, 0) / locations.length : 0;

return { totalViews, totalClicks, avgRating, avgHealthScore };
};

const stats = getOverallStats();

if (loading) {
return (
<div className="flex items-center justify-center min-h-[400px]">
<Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
);
}

return (
<div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
<div>
<h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
<p className="text-muted-foreground mt-2">
Manage and monitor all your business locations
</p>
</div>
<div className="flex gap-2">
<Button onClick={handleSync} disabled={syncing} variant="outline">
<RefreshCw className={`w-4 h-4 mr-2 ${syncing && 'animate-spin'}`} />
{syncing ? 'Syncing...' : 'Sync All'}
</Button>
{/* ⭐️ زر التبديل إلى Map View ⭐️ */}
<Button onClick={() => router.push('/locations')} variant="secondary">
<Layers className="w-4 h-4 mr-2" />
Map View
</Button>
<Button>
<Plus className="w-4 h-4 mr-2" />
Add Location
</Button>
</div>
</div>

{/* Stats Cards */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Total Locations</CardTitle>
<MapPin className="w-4 h-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">{locations.length}</div>
<p className="text-xs text-muted-foreground">
Across all platforms
</p>
</CardContent>
</Card>

<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Total Views</CardTitle>
<Eye className="w-4 h-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">{formatLargeNumber(stats.totalViews)}</div>
<p className="text-xs text-muted-foreground">
Last 30 days
</p>
</CardContent>
</Card>

<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
<Star className="w-4 h-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">{(stats.avgRating || 0).toFixed(1)}</div>
<p className="text-xs text-muted-foreground">
Across all locations
</p>
</CardContent>
</Card>

<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
<Shield className="w-4 h-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">{Math.round(stats.avgHealthScore || 0)}%</div>
<p className="text-xs text-muted-foreground">
Optimization score
</p>
</CardContent>
</Card>
</div>

{/* Filters */}
<Card>
<CardContent className="p-6">
<div className="flex flex-col md:flex-row gap-4">
<div className="flex-1">
<div className="relative">
<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
<Input
placeholder="Search locations..."
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
className="pl-10"
/>
</div>
</div>

{/* ⭐️ تم استبدال Select بـ SelectComponent ⭐️ */}
<Select onValueChange={setSelectedStatus} value={selectedStatus}>
<SelectTrigger className="md:w-[180px]">
<SelectValue placeholder="Status" />
</SelectTrigger>
<SelectContent>
<SelectItem value="all">All Status</SelectItem>
<SelectItem value="verified">Verified</SelectItem>
<SelectItem value="pending">Pending</SelectItem>
<SelectItem value="suspended">Suspended</SelectItem>
</SelectContent>
</Select>

{/* ⭐️ تم استبدال Select بـ SelectComponent ⭐️ */}
<Select onValueChange={setSelectedCategory} value={selectedCategory}>
<SelectTrigger className="md:w-[180px]">
<SelectValue placeholder="Category" />
</SelectTrigger>
<SelectContent>
<SelectItem value="all">All Categories</SelectItem>
<SelectItem value="Coffee Shop">Coffee Shop</SelectItem>
<SelectItem value="Restaurant">Restaurant</SelectItem>
<SelectItem value="Cafe">Cafe</SelectItem>
</SelectContent>
</Select>

</div>
</CardContent>
</Card>

{/* Locations Grid */}
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
{filteredLocations.map((location) => (
<LocationCard
key={location.id}
location={location}
onEdit={(id) => {
toast.info(`Edit location ${id}`);
// Navigate to edit page
}}
onViewDetails={(id) => {
toast.info(`View details for ${id}`);
// Navigate to details page
}}
/>
))}
</div>

{/* Empty State */}
{filteredLocations.length === 0 && (
<Card>
<CardContent className="flex flex-col items-center justify-center py-16">
<MapPin className="w-12 h-12 text-muted-foreground mb-4" />
<h3 className="text-lg font-semibold mb-2">No locations found</h3>
<p className="text-muted-foreground text-center mb-4">
{searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all'
? 'Try adjusting your filters or search term'
: 'Get started by adding your first business location'
}
</p>
<Button>
<Plus className="w-4 h-4 mr-2" />
Add Location
</Button>
</CardContent>
</Card>
)}
</div>
);
}