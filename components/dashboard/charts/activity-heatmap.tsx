'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { format, getHours, getDay } from 'date-fns'

interface Activity {
  created_at: string
}

interface ActivityHeatmapProps {
  activities: Activity[]
}

interface HeatmapData {
  day: string
  hour: number
  value: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function generateHeatmapData(activities: Activity[]): HeatmapData[] {
  const dataMap = new Map<string, number>()
  
  // Initialize all cells with zero
  DAYS.forEach((day, dayIndex) => {
    HOURS.forEach(hour => {
      dataMap.set(`${dayIndex}-${hour}`, 0)
    })
  })
  
  // Count activities
  activities.forEach(activity => {
    const date = new Date(activity.created_at)
    const day = getDay(date)
    const hour = getHours(date)
    const key = `${day}-${hour}`
    dataMap.set(key, (dataMap.get(key) || 0) + 1)
  })
  
  // Convert to array
  const data: HeatmapData[] = []
  DAYS.forEach((dayName, dayIndex) => {
    HOURS.forEach(hour => {
      const key = `${dayIndex}-${hour}`
      data.push({
        day: dayName,
        hour,
        value: dataMap.get(key) || 0,
      })
    })
  })
  
  return data
}

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0) return 'bg-muted'
  
  const intensity = value / maxValue
  
  if (intensity >= 0.8) return 'bg-primary'
  if (intensity >= 0.6) return 'bg-primary/80'
  if (intensity >= 0.4) return 'bg-primary/60'
  if (intensity >= 0.2) return 'bg-primary/40'
  return 'bg-primary/20'
}

function findPeakHours(data: HeatmapData[]): { hour: number; day: string; value: number }[] {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  return sorted.slice(0, 3)
}

export function ActivityHeatmap({ activities }: ActivityHeatmapProps) {
  const heatmapData = generateHeatmapData(activities)
  const maxValue = Math.max(...heatmapData.map(d => d.value), 1)
  const peakHours = findPeakHours(heatmapData)
  
  // Group by day
  const dataByDay = DAYS.map(day => ({
    day,
    hours: heatmapData.filter(d => d.day === day),
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Peak Activity Hours</CardTitle>
            <CardDescription>Activity distribution by day and hour</CardDescription>
          </div>
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Peak Hours Summary */}
        <div className="mb-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm font-medium mb-2">🔥 Peak Activity Times:</p>
          <div className="grid grid-cols-3 gap-2">
            {peakHours.map((peak, index) => (
              <div key={index} className="text-xs">
                <span className="font-semibold">
                  {peak.day} {peak.hour}:00
                </span>
                <span className="text-muted-foreground ml-1">
                  ({peak.value} activities)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-12" /> {/* Empty corner */}
              {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => (
                <div 
                  key={hour} 
                  className="text-xs text-muted-foreground text-center"
                  style={{ width: '2rem' }}
                >
                  {hour}h
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {dataByDay.map(({ day, hours }) => (
              <div key={day} className="flex items-center mb-1">
                {/* Day label */}
                <div className="w-12 text-xs font-medium text-muted-foreground">
                  {day}
                </div>
                
                {/* Hour cells */}
                <div className="flex gap-1">
                  {hours.map((cell, index) => {
                    const intensity = getIntensityColor(cell.value, maxValue)
                    return (
                      <div
                        key={index}
                        className={`h-6 w-6 rounded-sm ${intensity} transition-all hover:scale-110 hover:shadow-md cursor-pointer`}
                        title={`${day} ${cell.hour}:00 - ${cell.value} activities`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Less activity</span>
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded-sm bg-muted" />
            <div className="h-4 w-4 rounded-sm bg-primary/20" />
            <div className="h-4 w-4 rounded-sm bg-primary/40" />
            <div className="h-4 w-4 rounded-sm bg-primary/60" />
            <div className="h-4 w-4 rounded-sm bg-primary/80" />
            <div className="h-4 w-4 rounded-sm bg-primary" />
          </div>
          <span className="text-muted-foreground">More activity</span>
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Insight:</span> Schedule your posts and responses 
            during peak hours to maximize engagement with your customers.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

