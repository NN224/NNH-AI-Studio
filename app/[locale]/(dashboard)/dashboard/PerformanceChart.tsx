'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Review {
  rating: number;
  created_at: string;
}

interface PerformanceChartProps {
  reviews: Review[];
}

export function PerformanceChart({ reviews }: PerformanceChartProps) {
  // Group reviews by date for last 30 days
  const getLast30DaysData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayReviews = reviews.filter(r => {
        const reviewDate = new Date(r.created_at).toISOString().split('T')[0];
        return reviewDate === dateStr;
      });
      
      data.push({
        date: dateStr,
        reviews: dayReviews.length,
        avgRating: dayReviews.length > 0 
          ? (dayReviews.reduce((acc, r) => acc + r.rating, 0) / dayReviews.length).toFixed(1)
          : 0
      });
    }
    
    return data;
  };
  
  const chartData = getLast30DaysData();
  
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis 
          dataKey="date" 
          stroke="#71717a"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis stroke="#71717a" tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#18181b', 
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            color: '#f4f4f5'
          }}
        />
        <Legend 
          wrapperStyle={{ color: '#a1a1aa' }}
        />
        <Line 
          type="monotone" 
          dataKey="reviews" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Reviews"
          dot={false}
        />
        <Line 
          type="monotone" 
          dataKey="avgRating" 
          stroke="#eab308" 
          strokeWidth={2}
          name="Avg Rating"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

