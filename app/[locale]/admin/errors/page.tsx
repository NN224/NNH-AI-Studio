'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { AlertCircle, AlertTriangle, CheckCircle, Info, RefreshCw, XCircle } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'

interface ErrorLog {
  id: string
  user_id: string | null
  error_type: string
  error_message: string
  error_code: string | null
  stack_trace: string | null
  url: string | null
  severity: 'info' | 'warning' | 'error' | 'critical'
  resolved: boolean
  created_at: string
  context: Record<string, unknown>
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const locale = useLocale()
  const supabase = createClient()

  const fetchErrors = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setErrors(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchErrors()

    if (!supabase) return

    // Subscribe to real-time updates
    const channel = supabase
      .channel('error-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_logs' },
        (payload) => {
          setErrors((prev) => [payload.new as ErrorLog, ...prev])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info':
        return <Info className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'error':
        return <AlertCircle className="w-4 h-4" />
      case 'critical':
        return <XCircle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-orange-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const markAsResolved = async (errorId: string) => {
    if (!supabase) return

    await supabase
      .from('error_logs')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', errorId)

    fetchErrors()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring</h1>
          <p className="text-muted-foreground">Track and resolve application errors in real-time</p>
        </div>
        <Button onClick={fetchErrors} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {errors.filter((e) => e.severity === 'critical').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {errors.filter((e) => !e.resolved).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {errors.filter((e) => e.resolved).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Click on an error to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading errors...</div>
                ) : errors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No errors found 🎉</div>
                ) : (
                  errors.map((error) => (
                    <div
                      key={error.id}
                      onClick={() => setSelectedError(error)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        selectedError?.id === error.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <div
                            className={`p-1 rounded ${getSeverityColor(error.severity)} text-white`}
                          >
                            {getSeverityIcon(error.severity)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{error.error_type}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {error.error_message}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(error.created_at), 'PPp', {
                                locale: locale === 'ar' ? ar : undefined,
                              })}
                            </div>
                          </div>
                        </div>
                        {error.resolved ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Unresolved</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Error Details</CardTitle>
            <CardDescription>
              {selectedError
                ? 'Error information and stack trace'
                : 'Select an error to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedError ? (
              <div className="space-y-4">
                {/* Error Info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className={getSeverityColor(selectedError.severity)}>
                      {selectedError.severity.toUpperCase()}
                    </Badge>
                    {!selectedError.resolved && (
                      <Button size="sm" onClick={() => markAsResolved(selectedError.id)}>
                        Mark as Resolved
                      </Button>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Type</div>
                    <div className="font-mono text-sm">{selectedError.error_type}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Message</div>
                    <div className="text-sm">{selectedError.error_message}</div>
                  </div>

                  {selectedError.url && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">URL</div>
                      <div className="font-mono text-xs">{selectedError.url}</div>
                    </div>
                  )}

                  {selectedError.error_code && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Error Code</div>
                      <div className="font-mono text-sm">{selectedError.error_code}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Time</div>
                    <div className="text-sm">
                      {format(new Date(selectedError.created_at), 'PPpp', {
                        locale: locale === 'ar' ? ar : undefined,
                      })}
                    </div>
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedError.stack_trace && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Stack Trace
                    </div>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-3">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {selectedError.stack_trace}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* Context */}
                {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Context</div>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-3">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(selectedError.context, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                Select an error from the list to view its details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
