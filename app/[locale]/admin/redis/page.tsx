'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Info,
  RefreshCw,
  Server,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface RedisStats {
  connected: boolean
  dbSize: number
  hits: number
  misses: number
  hitRate: number
  memory: {
    used: string
    peak: string
    percentage: number
  }
  operations: {
    total: number
    perSecond: number
  }
  uptime: number
  version: string
}

export default function RedisMonitoringPage() {
  const [stats, setStats] = useState<RedisStats>({
    connected: false,
    dbSize: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    memory: {
      used: '0 MB',
      peak: '0 MB',
      percentage: 0,
    },
    operations: {
      total: 0,
      perSecond: 0,
    },
    uptime: 0,
    version: '',
  })
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    fetchRedisStats()
    const interval = setInterval(fetchRedisStats, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchRedisStats = async () => {
    try {
      const response = await fetch('/api/admin/redis-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch Redis stats')
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async (pattern?: string) => {
    setClearing(true)
    try {
      const response = await fetch('/api/admin/redis-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: pattern || '*' }),
      })

      if (response.ok) {
        await fetchRedisStats()
      }
    } catch (error) {
      console.error('Failed to clear cache')
    } finally {
      setClearing(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Redis Cache Monitor</h1>
          <p className="text-muted-foreground">Upstash Redis performance and statistics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRedisStats} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => clearCache()} variant="destructive" disabled={clearing}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Cache
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Alert className={stats.connected ? 'border-green-500' : 'border-red-500'}>
        <div className="flex items-center gap-2">
          {stats.connected ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            <strong>Redis Status:</strong> {stats.connected ? 'Connected' : 'Disconnected'}
            {stats.version && ` • Version: ${stats.version}`}
            {stats.uptime > 0 && ` • Uptime: ${formatUptime(stats.uptime)}`}
          </AlertDescription>
        </div>
      </Alert>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Database Size</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dbSize.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Hit Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.hits} hits / {stats.misses} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Operations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.operations.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.operations.perSecond} ops/sec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Memory Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.memory.used}</div>
            <Progress value={stats.memory.percentage} className="h-1 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Cache Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Categories</CardTitle>
          <CardDescription>Manage different cache types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Rate Limiting</p>
                  <p className="text-sm text-muted-foreground">API rate limit counters</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Active</Badge>
                <Button size="sm" variant="outline" onClick={() => clearCache('rate-limit:*')}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">API Cache</p>
                  <p className="text-sm text-muted-foreground">Cached API responses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Active</Badge>
                <Button size="sm" variant="outline" onClick={() => clearCache('api:*')}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Query Cache</p>
                  <p className="text-sm text-muted-foreground">Database query results</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Active</Badge>
                <Button size="sm" variant="outline" onClick={() => clearCache('query:*')}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Session Cache</p>
                  <p className="text-sm text-muted-foreground">User session data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Active</Badge>
                <Button size="sm" variant="outline" onClick={() => clearCache('session:*')}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cache Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Hit Rate</span>
                <span className="text-sm font-medium">{stats.hitRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.hitRate} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Memory Usage</span>
                <span className="text-sm font-medium">{stats.memory.percentage}%</span>
              </div>
              <Progress value={stats.memory.percentage} />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Peak Memory</span>
                <span className="text-sm">{stats.memory.peak}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Endpoint</span>
                <span className="text-xs font-mono">crucial-redfish-38841.upstash.io</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Region</span>
                <span className="text-sm">Global</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Connections</span>
                <span className="text-sm">1000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Request Size</span>
                <span className="text-sm">1MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Daily Request Limit</span>
                <span className="text-sm">10,000</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Upstash Redis</strong> is being used for rate limiting, API caching, and session
          management. The cache automatically expires based on TTL settings. Clear cache only when
          necessary.
        </AlertDescription>
      </Alert>
    </div>
  )
}
