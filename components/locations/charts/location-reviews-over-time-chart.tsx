"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Location } from '@/components/locations/location-types';

interface LocationReviewsOverTimeChartProps {
  locations: Location[];
  dateRange: string;
}

export function LocationReviewsOverTimeChart({ locations, dateRange }: LocationReviewsOverTimeChartProps) {
  const chartData = useMemo(() => {
    if (locations.length === 0) return [];

    // Group by category and sum review counts
    const categoryReviews: Record<string, number> = {};
    
    locations.forEach(loc => {
      const category = loc.category || 'Uncategorized';
      categoryReviews[category] = (categoryReviews[category] || 0) + (loc.reviewCount || 0);
    });

    return Object.entries(categoryReviews)
      .map(([category, reviews]) => ({
        category,
        reviews,
      }))
      .sort((a, b) => b.reviews - a.reviews)
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
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="category" 
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Bar 
          dataKey="reviews" 
          fill="#10b981" 
          name="Total Reviews"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

