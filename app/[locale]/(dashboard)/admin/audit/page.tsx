'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  Database,
  Download,
  Globe,
  Info,
  Key,
  RefreshCw,
  Search,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface AuditLog {
  id: string
  user_id: string
  action: string
  severity: 'info' | 'warning' | 'critical'
  resource_type?: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
  created_at: string
  user?: {
    email: string
    full_name?: string
  }
}

const ACTION_CATEGORIES = {
  AUTH: [
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'PASSWORD_CHANGE',
    'ADMIN_LOGIN',
    'ADMIN_2FA_REQUESTED',
  ],
  GMB: ['GMB_CONNECT', 'GMB_DISCONNECT', 'GMB_SYNC', 'GMB_UPDATE'],
  DATA: ['DATA_EXPORT', 'DATA_DELETE', 'BULK_DELETE', 'DATA_IMPORT'],
  ADMIN: ['ADMIN_ACTION', 'PERMISSION_CHANGE', 'SETTINGS_CHANGE', 'USER_SUSPEND', 'USER_DELETE'],
  API: ['API_KEY_CREATE', 'API_KEY_DELETE', 'API_KEY_REGENERATE'],
  ACCOUNT: ['ACCOUNT_DELETE', 'ACCOUNT_UPDATE', 'PROFILE_UPDATE'],
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    critical: 0,
    failed: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAuditLogs()
  }, [selectedSeverity, selectedCategory, dateRange])

  const fetchAuditLogs = async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('audit_logs')
        .select(
          `
          *,
          user:profiles!user_id(email, full_name)
        `,
        )
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (selectedSeverity !== 'all') {
        query = query.eq('severity', selectedSeverity)
      }

      const { data, error } = await query

      if (error) {
        // Error fetching audit logs
      } else if (data) {
        // Filter by category if selected
        let filteredData = data
        if (selectedCategory !== 'all') {
          const categoryActions =
            ACTION_CATEGORIES[selectedCategory as keyof typeof ACTION_CATEGORIES]
          filteredData = data.filter((log) => categoryActions.includes(log.action))
        }

        setLogs(filteredData)

        // Calculate stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        setStats({
          total: filteredData.length,
          today: filteredData.filter((log) => new Date(log.created_at) >= today).length,
          critical: filteredData.filter((log) => log.severity === 'critical').length,
          failed: filteredData.filter((log) => !log.success).length,
        })
      }
    } catch (error) {
      // Error fetching data
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.includes(searchTerm)

    return matchesSearch
  })

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getActionIcon = (action: string) => {
    if (ACTION_CATEGORIES.AUTH.includes(action)) return <User className="h-4 w-4" />
    if (ACTION_CATEGORIES.GMB.includes(action)) return <Globe className="h-4 w-4" />
    if (ACTION_CATEGORIES.DATA.includes(action)) return <Database className="h-4 w-4" />
    if (ACTION_CATEGORIES.API.includes(action)) return <Key className="h-4 w-4" />
    if (ACTION_CATEGORIES.ADMIN.includes(action)) return <Shield className="h-4 w-4" />
    return <Settings className="h-4 w-4" />
  }

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Severity', 'Resource', 'IP', 'Success', 'Details'].join(','),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.user?.email || 'System',
          log.action,
          log.severity,
          `${log.resource_type || ''} ${log.resource_id || ''}`.trim(),
          log.ip_address || '',
          log.success ? 'Yes' : 'No',
          JSON.stringify(log.details || {}),
        ].join(','),
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activities and security events</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAuditLogs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">In selected range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today's Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Unsuccessful attempts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, user, or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AUTH">Authentication</SelectItem>
                <SelectItem value="GMB">GMB Operations</SelectItem>
                <SelectItem value="DATA">Data Operations</SelectItem>
                <SelectItem value="ADMIN">Admin Actions</SelectItem>
                <SelectItem value="API">API Keys</SelectItem>
                <SelectItem value="ACCOUNT">Account</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from) {
                      setDateRange({
                        from: range.from,
                        to: range.to || range.from,
                      })
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Logs Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>{filteredLogs.length} events found</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="text-center py-8">Loading audit logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found for the selected filters
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="shrink-0 mt-1">{getSeverityIcon(log.severity)}</div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-semibold">{log.action.replace(/_/g, ' ')}</span>
                          {!log.success && (
                            <Badge variant="destructive" className="ml-2">
                              Failed
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">User:</span> {log.user?.email || 'System'}
                        {log.user?.full_name && ` (${log.user.full_name})`}
                      </div>

                      {log.resource_type && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Resource:</span> {log.resource_type}
                          {log.resource_id && ` #${log.resource_id}`}
                        </div>
                      )}

                      {log.ip_address && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">IP:</span> {log.ip_address}
                        </div>
                      )}

                      {log.error_message && (
                        <div className="text-sm text-red-600">
                          <span className="font-medium">Error:</span> {log.error_message}
                        </div>
                      )}

                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(
                filteredLogs.reduce(
                  (acc, log) => {
                    acc[log.action] = (acc[log.action] || 0) + 1
                    return acc
                  },
                  {} as Record<string, number>,
                ),
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm">{action.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(
                filteredLogs.reduce(
                  (acc, log) => {
                    const user = log.user?.email || 'System'
                    acc[user] = (acc[user] || 0) + 1
                    return acc
                  },
                  {} as Record<string, number>,
                ),
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([user, count]) => (
                  <div key={user} className="flex items-center justify-between">
                    <span className="text-sm truncate">{user}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
