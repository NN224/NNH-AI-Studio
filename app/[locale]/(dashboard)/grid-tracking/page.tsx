import { GridHeatmap, GridPointDetails, RankingTrends } from './GridComponents';

// TypeScript Interfaces
interface GridPoint {
  x: number;
  y: number;
  lat: number;
  lng: number;
  rank: number | null;
  distance: number; // km from center
}

interface GridData {
  location_id: string;
  location_name: string;
  keyword: string;
  grid_size: 5 | 10 | 20;
  center_lat: number;
  center_lng: number;
  grid: GridPoint[][];
  stats: {
    averageRank: number;
    top3Count: number;
    top3Percentage: number;
    coveragePercentage: number;
    bestRank: number;
    worstRank: number;
  };
  checked_at: string;
}

// Generate mock grid data
function generateMockGridData(size: 5 | 10 | 20, locationName: string): GridData {
  const grid: GridPoint[][] = [];
  const centerIndex = Math.floor(size / 2);
  
  for (let y = 0; y < size; y++) {
    const row: GridPoint[] = [];
    for (let x = 0; x < size; x++) {
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - centerIndex, 2) + Math.pow(y - centerIndex, 2)
      );
      
      // Better ranking near center
      let rank: number | null;
      if (x === centerIndex && y === centerIndex) {
        rank = 1; // Your location - always #1
      } else if (distanceFromCenter < 2) {
        rank = Math.floor(Math.random() * 3) + 1; // 1-3
      } else if (distanceFromCenter < 3) {
        rank = Math.floor(Math.random() * 5) + 3; // 3-7
      } else if (distanceFromCenter < 4) {
        rank = Math.floor(Math.random() * 8) + 6; // 6-13
      } else {
        rank = Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 10 : null; // 10-20 or not ranked
      }
      
      row.push({
        x,
        y,
        lat: 25.2 + (y - centerIndex) * 0.01,
        lng: 55.27 + (x - centerIndex) * 0.01,
        rank,
        distance: distanceFromCenter * 1.2 // rough km
      });
    }
    grid.push(row);
  }
  
  // Calculate stats
  const allRanks = grid.flat().map(p => p.rank).filter(r => r !== null) as number[];
  const top3 = allRanks.filter(r => r <= 3).length;
  const avgRank = allRanks.reduce((sum, r) => sum + r, 0) / allRanks.length;
  
  return {
    location_id: '1',
    location_name: locationName,
    keyword: 'restaurant near me',
    grid_size: size,
    center_lat: 25.2,
    center_lng: 55.27,
    grid,
    stats: {
      averageRank: Math.round(avgRank * 10) / 10,
      top3Count: top3,
      top3Percentage: Math.round((top3 / allRanks.length) * 100),
      coveragePercentage: Math.round((allRanks.length / (size * size)) * 100),
      bestRank: Math.min(...allRanks),
      worstRank: Math.max(...allRanks)
    },
    checked_at: new Date().toISOString()
  };
}

// Stats Card Component
function GridStatsCard({
  title,
  value,
  icon,
  color,
  subtitle
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/20',
    green: 'border-green-500/20',
    red: 'border-red-500/20',
    purple: 'border-purple-500/20',
    orange: 'border-orange-500/20',
    zinc: 'border-zinc-500/20'
  };
  
  return (
    <div className={`bg-zinc-900/50 border ${colorClasses[color] || 'border-zinc-800'} rounded-xl p-4 hover:transform hover:-translate-y-1 transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-zinc-400 text-xs">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-zinc-500">{subtitle}</div>
      )}
    </div>
  );
}

// Main Component
export default async function GridTrackingPage() {
  // In Phase 3, fetch from database
  // For now, use mock data
  const gridData = generateMockGridData(10, 'The DXB Night Club');
  
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🗺️ Local Grid Tracking
            </h1>
            <p className="text-zinc-400">
              Track your local search rankings across geographic points
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium transition">
              📊 View Report
            </button>
            <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition">
              🔄 Refresh Data
            </button>
          </div>
        </div>
        
        {/* API Notice */}
        <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">🚧</span>
          <div className="flex-1">
            <div className="font-medium text-orange-400 mb-1">
              Demo Mode - API Integration Coming Soon
            </div>
            <div className="text-sm text-orange-300/70">
              This page shows mock data to demonstrate the grid tracking feature. Real-time ranking data will be available once API integration is complete in Phase 3.
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Location</label>
              <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none">
                <option>{gridData.location_name}</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Search Keyword</label>
              <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none">
                <option>restaurant near me</option>
                <option>best restaurant dubai</option>
                <option>night club dubai</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Grid Size</label>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition">
                  5×5
                </button>
                <button className="flex-1 px-3 py-2 bg-orange-600 rounded-lg text-white text-sm">
                  10×10
                </button>
                <button className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition">
                  20×20
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Time Period</label>
              <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none">
                <option>Current</option>
                <option>Last Week</option>
                <option>Last Month</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <GridStatsCard
            title="Avg Rank"
            value={gridData.stats.averageRank.toString()}
            icon="📊"
            color="blue"
          />
          <GridStatsCard
            title="Best Rank"
            value={`#${gridData.stats.bestRank}`}
            icon="🏆"
            color="green"
          />
          <GridStatsCard
            title="Worst Rank"
            value={`#${gridData.stats.worstRank}`}
            icon="⚠️"
            color="red"
          />
          <GridStatsCard
            title="Top 3"
            value={`${gridData.stats.top3Percentage}%`}
            icon="🎯"
            color="purple"
            subtitle={`${gridData.stats.top3Count} points`}
          />
          <GridStatsCard
            title="Coverage"
            value={`${gridData.stats.coveragePercentage}%`}
            icon="📍"
            color="orange"
          />
          <GridStatsCard
            title="Grid Points"
            value={gridData.grid_size * gridData.grid_size}
            icon="🗺️"
            color="zinc"
          />
        </div>
        
        {/* Main Grid Heatmap */}
        <GridHeatmap gridData={gridData} />
        
        {/* Bottom Row: Details + Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GridPointDetails gridData={gridData} />
          <RankingTrends />
        </div>
        
      </div>
    </div>
  );
}
