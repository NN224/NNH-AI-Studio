'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Database,
  Globe,
  Server,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  gmbAccounts: number
  totalLocations: number
  totalReviews: number
  pendingQuestions: number
  systemHealth: number
  apiCalls: number
  errorRate: number
  avgResponseTime: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    gmbAccounts: 0,
    totalLocations: 0,
    totalReviews: 0,
    pendingQuestions: 0,
    systemHealth: 95,
    apiCalls: 0,
    errorRate: 0,
    avgResponseTime: 0,
  })
  const [_loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardStats = async () => {
    setLoading(true)

    // Fetch various stats
    const [usersResult, gmbResult, locationsResult, reviewsResult, questionsResult] =
      await Promise.all([
        supabase.from('profiles').select('count'),
        supabase.from('gmb_accounts').select('count'),
        supabase.from('gmb_locations').select('count'),
        supabase.from('gmb_reviews').select('count'),
        supabase.from('gmb_questions').select('count').eq('answer_status', 'pending'),
      ])

    setStats({
      totalUsers: usersResult.data?.[0]?.count || 0,
      activeUsers: Math.floor((usersResult.data?.[0]?.count || 0) * 0.7),
      gmbAccounts: gmbResult.data?.[0]?.count || 0,
      totalLocations: locationsResult.data?.[0]?.count || 0,
      totalReviews: reviewsResult.data?.[0]?.count || 0,
      pendingQuestions: questionsResult.data?.[0]?.count || 0,
      systemHealth: 95,
      apiCalls: 12543,
      errorRate: 0.02,
      avgResponseTime: 145,
    })

    setLoading(false)
  }

  const quickActions = [
    { title: 'View Errors', href: '/admin/errors', icon: AlertCircle, color: 'text-red-500' },
    { title: 'System Monitor', href: '/admin/monitoring', icon: Activity, color: 'text-blue-500' },
    { title: 'User Management', href: '/admin/users', icon: Users, color: 'text-green-500' },
    { title: 'Database', href: '/admin/database', icon: Database, color: 'text-purple-500' },
  ]

  const _getHealthColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to NNH AI Studio Admin Panel</p>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Overall system status and performance</CardDescription>
            </div>
            <Badge variant={stats.systemHealth >= 90 ? 'default' : 'destructive'}>
              {stats.systemHealth >= 90 ? 'Healthy' : 'Issues Detected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{stats.systemHealth}%</div>
            <Progress value={stats.systemHealth} className="flex-1" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/monitoring">View Details</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeUsers} active today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">GMB Accounts</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gmbAccounts}</div>
            <p className="text-xs text-muted-foreground">{stats.totalLocations} locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Reviews</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingQuestions} pending Q&A</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">{stats.errorRate}% error rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link key={i} href={action.href}>
                <Button variant="outline" className="w-full h-24 flex-col gap-2">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                  <span className="text-sm">{action.title}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Latest system errors and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">API Rate Limit Exceeded</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Slow Query Detected</p>
                  <p className="text-xs text-muted-foreground">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Backup Completed</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/admin/errors">View All Errors</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>Current resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <Progress value={45} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Memory</span>
                <span className="text-sm text-muted-foreground">2.4GB / 4GB</span>
              </div>
              <Progress value={60} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Database</span>
                <span className="text-sm text-muted-foreground">256MB / 1GB</span>
              </div>
              <Progress value={25} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">8.2GB / 20GB</span>
              </div>
              <Progress value={41} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Links */}
      <div className="flex gap-4 flex-wrap">
        <Button variant="outline" asChild>
          <Link href="https://supabase.com/dashboard" target="_blank">
            <Database className="h-4 w-4 mr-2" />
            Supabase
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="https://vercel.com/dashboard" target="_blank">
            <Server className="h-4 w-4 mr-2" />
            Vercel
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="https://sentry.io" target="_blank">
            <Shield className="h-4 w-4 mr-2" />
            Sentry
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/api/diagnostics/database-health" target="_blank">
            <BarChart3 className="h-4 w-4 mr-2" />
            API Diagnostics
          </Link>
        </Button>
      </div>
    </div>
  )
}
