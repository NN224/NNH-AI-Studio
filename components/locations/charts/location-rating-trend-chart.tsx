"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Location } from '@/components/locations/location-types';

interface LocationRatingTrendChartProps {
  locations: Location[];
  dateRange: string;
}

export function LocationRatingTrendChart({ locations, dateRange }: LocationRatingTrendChartProps) {
  const chartData = useMemo(() => {
    if (locations.length === 0) return [];

    // Group by category and calculate average rating
    const categoryRatings: Record<string, { count: number; totalRating: number }> = {};
    
    locations.forEach(loc => {
      const category = loc.category || 'Uncategorized';
      if (!categoryRatings[category]) {
        categoryRatings[category] = { count: 0, totalRating: 0 };
      }
      categoryRatings[category].count++;
      categoryRatings[category].totalRating += loc.rating || 0;
    });

    return Object.entries(categoryRatings)
      .map(([category, data]) => ({
        category,
        rating: data.totalRating / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10); // Top 10 categories
  }, [locations]);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="category" 
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          domain={[0, 5]}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number) => value.toFixed(2)}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="rating" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Average Rating"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

