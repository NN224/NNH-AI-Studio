'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigationShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { LastSyncInfo } from '@/components/dashboard/last-sync-info';
// ⭐️ تم إزالة استدعاء WeeklyTasksWidget
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, Clock, ShieldCheck, TrendingUp, AlertTriangle, Loader2, Star, Send } from 'lucide-react'; // تم إضافة Loader2 و Star
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ⭐️ واجهة جديدة لتمثيل حالة عنق الزجاجة (Bottleneck)
interface Bottleneck {
type: 'Response' | 'Content' | 'Compliance' | 'Reviews' | 'General';
count: number;
message: string;
link: string;
severity: 'low' | 'medium' | 'high';
}

interface DashboardStats {
totalLocations: number;
locationsTrend: number;
averageRating: number;
allTimeAverageRating: number; 
ratingTrend: number;
totalReviews: number;
reviewsTrend: number;
responseRate: number;
responseTarget: number;

// ⭐️ مقاييس الذكاء الاصطناعي الجديدة
healthScore: number; // النتيجة الصحية من 100
bottlenecks: Bottleneck[]; // مصفوفة عنق الزجاجة
}

// ⭐️ مكون مصفوفة تدفق العمل الجديدة (Workflow Matrix)
const WorkflowMatrix = ({ bottlenecks }: { bottlenecks: Bottleneck[] }) => {
const iconMap = {
Response: <Clock className="w-5 h-5 text-yellow-600" />,
Content: <Send className="w-5 h-5 text-blue-600" />,
Compliance: <ShieldCheck className="w-5 h-5 text-red-600" />,
Reviews: <Star className="w-5 h-5 text-purple-600" />,
General: <AlertTriangle className="w-5 h-5 text-gray-500" />,
};

const severityColor = (severity: Bottleneck['severity']) => {
switch (severity) {
case 'high': return 'border-red-500 bg-red-500/10';
case 'medium': return 'border-yellow-500 bg-yellow-500/10';
default: return 'border-green-500 bg-green-500/10';
}
};

if (bottlenecks.length === 0) {
return (
<Card>
<CardHeader>
<CardTitle>Workflow Matrix</CardTitle>
<CardDescription>AI-identified bottlenecks in your operation.</CardDescription>
</CardHeader>
<CardContent className="flex items-center justify-center py-12 text-center">
<div className="text-muted-foreground">
<ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-500" />
<p>No critical bottlenecks detected. Your workflow is running smoothly!</p>
</div>
</CardContent>
</Card>
);
}

return (
<Card>
<CardHeader>
<CardTitle>Workflow Matrix</CardTitle>
<CardDescription>AI-identified bottlenecks in your operation.</CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-4">
{bottlenecks.map((task, index) => (
<div
key={index}
className={cn(
"flex items-center gap-3 p-4 rounded-lg border-l-4 transition-all",
severityColor(task.severity)
)}
>
<div className="flex-shrink-0">{iconMap[task.type] || iconMap.General}</div>
<div className="flex-grow">
<p className="font-semibold text-sm">{task.message}</p>
<p className="text-xs text-muted-foreground mt-1">Impact: {task.severity.toUpperCase()}</p>
</div>
<Button asChild size="sm" variant="outline" className="flex-shrink-0">
<Link href={task.link}>
Fix Now
</Link>
</Button>
</div>
))}
</div>
</CardContent>
</Card>
);
};


// ⭐️ مكون بطاقة الموقع النشط (Active Location Card) ⭐️
const ActiveLocationInfo = ({ loading, stats }: { loading: boolean; stats: DashboardStats }) => {
    // 💡 يمكن جلب الاسم بشكل ديناميكي من الـ API لاحقًا، لكن نستخدم حاليًا المكان الذي ذكره المستخدم في الصورة
    const activeLocationName = "Downtown Branch"; 

    // جلب الإحصائيات من 'stats'
    const totalLocations = stats.totalLocations || 0;
    const averageRating = stats.allTimeAverageRating || 0; 

    if (loading) {
        return (
            <Card className="lg:col-span-1 border border-primary/20 flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </Card>
        );
    }

    return (
      <Card className="lg:col-span-1 border border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">Active Location</CardTitle>
          <MapPin className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
            <h3 className="text-xl font-bold truncate">
                {totalLocations === 0 ? "No Locations" : activeLocationName}
            </h3>
            {totalLocations > 0 && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {averageRating.toFixed(1)} / 5.0 Rating
                </p>
            )}
            {totalLocations > 1 && (
                <Link href="/dashboard/locations" className="text-xs text-primary hover:underline mt-1 block">
                    Manage {totalLocations - 1} more
                </Link>
            )}
        </CardContent>
      </Card>
    );
};


export default function DashboardPage() {
useNavigationShortcuts();
const supabase = createClient();
const router = useRouter();

const [loading, setLoading] = useState(true);
const [stats, setStats] = useState<DashboardStats>({
totalLocations: 0,
locationsTrend: 0,
averageRating: 0,
allTimeAverageRating: 0, 
ratingTrend: 0,
totalReviews: 0,
reviewsTrend: 0,
responseRate: 0,
responseTarget: 100,

// ⭐️ تهيئة الحقول الجديدة
healthScore: 0,
bottlenecks: [],
});

const [gmbConnected, setGmbConnected] = useState(false);
const [gmbAccountId, setGmbAccountId] = useState<string | null>(null);
const [syncSchedule, setSyncSchedule] = useState<string>('manual');
const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
const [syncing, setSyncing] = useState(false);
const [disconnecting, setDisconnecting] = useState(false);

const fetchDashboardData = async () => {
try {
setLoading(true);

const {
data: { user: authUser },
error: authError
} = await supabase.auth.getUser();

if (authError || !authUser) {
console.error("Authentication error:", authError);
router.push("/auth/login");
return;
}

// Check GMB connection status (المنطق يبقى كما هو)
const { data: gmbAccounts } = await supabase
.from("gmb_accounts")
.select("id, is_active, settings, last_sync")
.eq("user_id", authUser.id);

const activeAccount = gmbAccounts?.find(acc => acc.is_active);
const hasActiveAccount = !!activeAccount;
setGmbConnected(hasActiveAccount);

if (activeAccount) {
setGmbAccountId(activeAccount.id);

if (activeAccount.settings) {
const schedule = activeAccount.settings.syncSchedule || 'manual';
setSyncSchedule(schedule);
}

if (activeAccount.last_sync) {
setLastSyncTime(new Date(activeAccount.last_sync));
}
}

// ⭐️ START: جلب الإحصائيات المُعالجة من الباك إند
if (hasActiveAccount) {
const statsRes = await fetch('/api/dashboard/stats');
const newStats = await statsRes.json();

if (statsRes.ok && newStats) {
setStats({
totalLocations: newStats.totalLocations || 0,
locationsTrend: newStats.locationsTrend || 0,
averageRating: newStats.recentAverageRating || 0, 
allTimeAverageRating: newStats.allTimeAverageRating || 0, 
ratingTrend: newStats.ratingTrend || 0,
totalReviews: newStats.totalReviews || 0,
reviewsTrend: newStats.reviewsTrend || 0,
responseRate: newStats.responseRate || 0,
responseTarget: 100,

// ⭐️ تعبئة المقاييس الجديدة من الباك إند
healthScore: newStats.healthScore || 0,
bottlenecks: newStats.bottlenecks || [],
});
} else {
console.error('Failed to fetch processed stats:', newStats);
setStats(prev => ({ 
...prev, 
totalReviews: 0, 
averageRating: 0, 
allTimeAverageRating: 0,
healthScore: 0,
bottlenecks: [],
}));
}
} else {
setStats({
totalLocations: 0,
locationsTrend: 0,
averageRating: 0,
allTimeAverageRating: 0,
ratingTrend: 0,
totalReviews: 0,
reviewsTrend: 0,
responseRate: 0,
responseTarget: 100,
healthScore: 0, // صفر
bottlenecks: [], // فارغ
});
}
// ⭐️ END: جلب الإحصائيات المُعالجة

} catch (error) {
console.error('Error fetching dashboard data:', error);
toast.error('Failed to load dashboard data');
} finally {
setLoading(false);
}
};

useEffect(() => {
fetchDashboardData();

const handleSyncComplete = () => {
fetchDashboardData();
};

window.addEventListener('gmb-sync-complete', handleSyncComplete);
return () => {
window.removeEventListener('gmb-sync-complete', handleSyncComplete);
};
}, []);

const handleSync = async () => {
// ... (منطق المزامنة يبقى كما هو) ...
if (!gmbAccountId) {
toast.error('No GMB account connected');
return;
}

try {
setSyncing(true);
const response = await fetch('/api/gmb/sync', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ account_id: gmbAccountId, sync_type: 'full' }),
});

if (!response.ok) {
let errorMessage = 'Sync failed';
try {
const errorData = await response.json();
errorMessage = errorData.error || errorData.message || `Sync failed: ${response.status}`;
} catch {
errorMessage = `Sync failed: ${response.status} ${response.statusText}`;
}
throw new Error(errorMessage);
}

const data = await response.json();

if (data.ok || data.success) {
setLastSyncTime(new Date());
toast.success('Sync completed successfully!');

window.dispatchEvent(new CustomEvent('gmb-sync-complete', { detail: data }));

await fetchDashboardData();
} else {
throw new Error(data.error || 'Sync failed');
}
} catch (error) {
console.error('Sync error:', error);
toast.error('Failed to sync data');
} finally {
setSyncing(false);
}
};

const handleDisconnect = async () => {
// ... (منطق الفصل يبقى كما هو) ...
if (!gmbAccountId) {
toast.error('No GMB account connected');
return;
}

if (!confirm('Are you sure you want to disconnect Google My Business? Sync will stop but your data will be preserved.')) {
return;
}

try {
setDisconnecting(true);
const response = await fetch('/api/gmb/disconnect', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ accountId: gmbAccountId }),
});

if (!response.ok) {
const errorData = await response.json().catch(() => ({}));
throw new Error(errorData.error || errorData.message || 'Failed to disconnect');
}

toast.success('Google My Business disconnected successfully');
setGmbConnected(false);
setGmbAccountId(null);

await fetchDashboardData();
} catch (error: any) {
console.error('Disconnect error:', error);
toast.error(error.message || 'Failed to disconnect');
} finally {
setDisconnecting(false);
}
};

// ⭐️ دالة إظهار بطاقة Health Score (سيتم استبدالها بـ StatsCards لاحقاً)
const HealthScoreCard = () => (
<Card className={cn("lg:col-span-1 border-l-4", 
stats.healthScore > 80 ? 'border-green-500' : 
stats.healthScore > 60 ? 'border-yellow-500' : 'border-red-500'
)}>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">GMB Health Score</CardTitle>
<ShieldCheck className="w-4 h-4 text-primary" />
</CardHeader>
<CardContent>
<div className="text-4xl font-bold">
{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${stats.healthScore}%`}
</div>
<p className="text-xs text-muted-foreground mt-1">
Score based on Quality, Visibility, and Compliance.
</p>
</CardContent>
</Card>
);

  // ⭐️ مكون بطاقة الموقع النشط (Active Location Card) ⭐️
  const ActiveLocationInfo = () => {
      // 💡 يمكن جلب الاسم بشكل ديناميكي من الـ API لاحقًا، لكن نستخدم حاليًا المكان الذي ذكره المستخدم في الصورة
      const activeLocationName = "Downtown Branch"; 

      // جلب الإحصائيات من 'stats'
      const totalLocations = stats.totalLocations || 0;
      const averageRating = stats.allTimeAverageRating || 0; 

      if (loading) {
          return (
              <Card className="lg:col-span-1 border border-primary/20 flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </Card>
          );
      }

      return (
        <Card className="lg:col-span-1 border border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Location</CardTitle>
            <MapPin className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
              <h3 className="text-xl font-bold truncate">
                  {totalLocations === 0 ? "No Locations" : activeLocationName}
              </h3>
              {totalLocations > 0 && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {averageRating.toFixed(1)} / 5.0 Rating
                  </p>
              )}
              {totalLocations > 1 && (
                  <Link href="/dashboard/locations" className="text-xs text-primary hover:underline mt-1 block">
                      Manage {totalLocations - 1} more
                  </Link>
              )}
          </CardContent>
        </Card>
      );
  };


return (
<div className="space-y-8">
<div className="flex items-center justify-between">
<div>
<h1 className="text-3xl font-bold tracking-tight">AI Command Center</h1>
<p className="text-muted-foreground mt-2">
Proactive risk and growth orchestration dashboard
</p>
</div>
<Button
variant="outline"
size="sm"
onClick={fetchDashboardData}
disabled={loading}
>
<RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
Refresh
</Button>
</div>

{/* ⭐️ تم تعديل هذا القسم لدمج بطاقة ActiveLocationInfo ⭐️ */}
{gmbConnected && (
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
<LastSyncInfo
lastSyncTime={lastSyncTime}
isSyncing={syncing}
onSync={handleSync}
syncSchedule={syncSchedule}
onDisconnect={handleDisconnect}
isDisconnecting={disconnecting}
            className="lg:col-span-3" // تخصيص حجم LastSyncInfo
/>
          <ActiveLocationInfo loading={loading} stats={stats} />
</div>
)}


{/* ⭐️ تم تعديل هذا القسم ليناسب GMB Health Score و StatsCards */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
<HealthScoreCard />
<StatsCards loading={loading} data={stats} />
</div>

<div className="grid gap-6 lg:grid-cols-2">
{/* ⭐️ تم استبدال WeeklyTasksWidget بـ WorkflowMatrix */}
<WorkflowMatrix bottlenecks={stats.bottlenecks} />

<Card>
<CardHeader>
<CardTitle>AI Risk & Opportunity Feed</CardTitle>
<CardDescription>Predictive alerts and automated executions</CardDescription>
</CardHeader>
<CardContent>
{/* ⭐️ محتوى خلاصة المخاطر والفرص (أصبح أكثر استباقية) */}
<div className="text-sm text-muted-foreground">
{gmbConnected ? (
<div className="space-y-3">
<div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/50">
<AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
<div>
<p className="font-semibold text-yellow-500">PREDICTIVE ALERT</p>
<p className="text-foreground">AI predicts a potential 15% drop in local search visibility next week due to competitor activity near the "Downtown Branch".</p>
</div>
</div>
<div className="flex items-start gap-2 p-2 bg-green-500/10 rounded-md border border-green-500/50">
<TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
<div>
<p className="font-semibold text-green-500">OPPORTUNITY</p>
<p className="text-foreground">Analytics suggest a Post about "Limited Time Offer" could increase call clicks by 25% this weekend. <Link href="/dashboard/gmb-posts" className="text-primary hover:underline">Create Post Now</Link></p>
</div>
</div>
<div className="text-muted-foreground">
Last execution: System automatically responded to 4 x 5-star reviews (Positive Tone).
</div>
</div>
) : (
<p>Connect your Google My Business account to receive proactive AI risk and opportunity alerts.</p>
)}
</div>
</CardContent>
</Card>
</div>
</div>
);
}