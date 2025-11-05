"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Location } from '@/components/locations/location-types';

interface LocationHealthScoreDistributionChartProps {
  locations: Location[];
}

export function LocationHealthScoreDistributionChart({ locations }: LocationHealthScoreDistributionChartProps) {
  const chartData = useMemo(() => {
    if (locations.length === 0) return [];

    // Group health scores into ranges
    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];

    return ranges.map(({ range, min, max }) => ({
      range,
      count: locations.filter(loc => {
        const score = loc.healthScore || 0;
        return score >= min && score <= max;
      }).length,
    }));
  }, [locations]);

  if (chartData.length === 0 || chartData.every(d => d.count === 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="range" 
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number) => value}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Bar 
          dataKey="count" 
          fill="#8b5cf6" 
          name="Locations"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

