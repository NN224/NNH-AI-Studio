'use client';

import { useState } from 'react';

export function GridHeatmap({ gridData }: { gridData: any }) {
  const [hoveredCell, setHoveredCell] = useState<any>(null);
  
  const getRankColor = (rank: number | null) => {
    if (rank === null) return 'bg-zinc-800/50 border-zinc-700';
    if (rank === 1) return 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-400';
    if (rank <= 3) return 'bg-green-500/80 border-green-400';
    if (rank <= 7) return 'bg-blue-500/80 border-blue-400';
    if (rank <= 15) return 'bg-orange-500/80 border-orange-400';
    return 'bg-red-500/80 border-red-400';
  };
  
  const getRankEmoji = (rank: number | null, x: number, y: number) => {
    const centerIndex = Math.floor(gridData.grid_size / 2);
    if (x === centerIndex && y === centerIndex) return '🏢';
    if (rank === null) return '—';
    return rank.toString();
  };
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            🗺️ Grid Heatmap
          </h3>
          <p className="text-sm text-zinc-400">
            Your ranking from different geographic points • Click cells for details
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex gap-3 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-zinc-400">Top 3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-zinc-400">4-7</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-zinc-400">8-15</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-zinc-400">16+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-700 rounded"></div>
            <span className="text-zinc-400">Not Ranked</span>
          </div>
        </div>
      </div>
      
      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div 
            className="grid gap-1 mx-auto" 
            style={{ 
              gridTemplateColumns: `repeat(${gridData.grid_size}, minmax(0, 1fr))`,
              maxWidth: 'fit-content'
            }}
          >
            {gridData.grid.map((row: any[], y: number) =>
              row.map((cell: any, x: number) => (
                <div
                  key={`${x}-${y}`}
                  className={`
                    aspect-square flex items-center justify-center
                    rounded-lg border-2 cursor-pointer
                    transition-all hover:scale-110 hover:z-10 hover:shadow-lg
                    relative
                    ${getRankColor(cell.rank)}
                    ${hoveredCell?.x === x && hoveredCell?.y === y ? 'scale-110 z-10 shadow-lg' : ''}
                  `}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`Position (${x}, ${y}): ${cell.rank ? `Rank #${cell.rank}` : 'Not Ranked'}`}
                >
                  <span className="text-white font-bold text-xs sm:text-sm md:text-base">
                    {getRankEmoji(cell.rank, x, y)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Hover Details */}
      {hoveredCell && (
        <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-zinc-500 text-xs mb-1">Position</div>
              <div className="text-white font-medium">({hoveredCell.x}, {hoveredCell.y})</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Rank</div>
              <div className="text-white font-medium">
                {hoveredCell.rank ? `#${hoveredCell.rank}` : 'Not Ranked'}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Distance</div>
              <div className="text-white font-medium">{hoveredCell.distance.toFixed(1)} km</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Coordinates</div>
              <div className="text-white font-medium text-xs">
                {hoveredCell.lat.toFixed(4)}, {hoveredCell.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-center text-xs text-zinc-500">
        Last checked: {new Date(gridData.checked_at).toLocaleString()}
      </div>
    </div>
  );
}

export function GridPointDetails({ gridData }: { gridData: any }) {
  const topPoints = gridData.grid
    .flat()
    .filter((p: any) => p.rank !== null)
    .sort((a: any, b: any) => a.rank - b.rank)
    .slice(0, 10);
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">
        📍 Top Grid Points
      </h3>
      
      {topPoints.length > 0 ? (
        <div className="space-y-2">
          {topPoints.map((point: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition"
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${point.rank <= 3 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}
                `}>
                  #{point.rank}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    Position ({point.x}, {point.y})
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {point.distance.toFixed(1)} km away
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500">
          <div className="text-4xl mb-2">📍</div>
          <p>No ranked points available</p>
        </div>
      )}
    </div>
  );
}

export function RankingTrends() {
  // Mock trend data
  const trends = [
    { date: 'Nov 1', avg: 6.5 },
    { date: 'Nov 2', avg: 6.2 },
    { date: 'Nov 3', avg: 5.8 },
    { date: 'Nov 4', avg: 5.5 },
    { date: 'Nov 5', avg: 5.3 },
    { date: 'Nov 6', avg: 5.2 }
  ];
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">
        📈 Ranking Trends
      </h3>
      
      <div className="h-48 flex items-end gap-2">
        {trends.map((day, index) => {
          const height = ((10 - day.avg) / 10) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs text-white font-medium">
                {day.avg}
              </div>
              <div 
                className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t transition-all hover:opacity-80"
                style={{ height: `${height}%` }}
              />
              <div className="text-xs text-zinc-500 rotate-45 origin-left whitespace-nowrap">
                {day.date}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 flex items-center justify-between text-sm flex-wrap gap-2">
        <div className="text-zinc-400">
          Trend: <span className="text-green-400">↗ Improving</span>
        </div>
        <div className="text-zinc-400">
          Change: <span className="text-green-400">-1.3 avg rank</span>
        </div>
      </div>
    </div>
  );
}

