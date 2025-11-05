"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Location } from '@/components/locations/location-types';

interface LocationCategoryComparisonChartProps {
  locations: Location[];
}

export function LocationCategoryComparisonChart({ locations }: LocationCategoryComparisonChartProps) {
  const chartData = useMemo(() => {
    if (locations.length === 0) return [];

    // Group by category and calculate averages
    const categoryData: Record<string, {
      count: number;
      totalRating: number;
      totalReviews: number;
      totalHealthScore: number;
    }> = {};
    
    locations.forEach(loc => {
      const category = loc.category || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = {
          count: 0,
          totalRating: 0,
          totalReviews: 0,
          totalHealthScore: 0,
        };
      }
      categoryData[category].count++;
      categoryData[category].totalRating += loc.rating || 0;
      categoryData[category].totalReviews += loc.reviewCount || 0;
      categoryData[category].totalHealthScore += loc.healthScore || 0;
    });

    return Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        avgRating: data.totalRating / data.count,
        avgHealthScore: data.totalHealthScore / data.count,
        totalReviews: data.totalReviews,
        count: data.count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 8); // Top 8 categories
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
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === 'avgRating') return value.toFixed(2);
            if (name === 'avgHealthScore') return `${Math.round(value)}%`;
            return value.toLocaleString();
          }}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Bar 
          yAxisId="left"
          dataKey="avgRating" 
          fill="#3b82f6" 
          name="Avg Rating"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          yAxisId="right"
          dataKey="avgHealthScore" 
          fill="#f59e0b" 
          name="Avg Health Score"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

