"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Loader2, 
  RefreshCw,
  Shield,
  Database,
  Settings,
  TrendingUp,
  Download,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AuditResult {
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'OK'
  category: string
  issue: string
  count: number
  details?: Record<string, unknown>
}

interface AuditSummary {
  timestamp: string
  total_issues: number
  critical_count: number
  warning_count: number
  info_count: number
  data_volume: Record<string, number>
  security_status: string
  recommendations: string[]
}

export function GMBAuditPanel() {
  const [loading, setLoading] = useState(false)
  const [auditData, setAuditData] = useState<{
    summary: AuditSummary | null
    results: AuditResult[]
  }>({ summary: null, results: [] })

  const runAudit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/gmb/audit')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Audit failed')
      }

      setAuditData(data)
      
      if (data.summary.critical_count > 0) {
        toast.error(`Audit found ${data.summary.critical_count} critical issues`, {
          description: 'Review the results below for details'
        })
      } else if (data.summary.warning_count > 0) {
        toast.warning(`Audit found ${data.summary.warning_count} warnings`, {
          description: 'Consider addressing these issues'
        })
      } else {
        toast.success('Audit completed successfully', {
          description: 'No critical issues found'
        })
      }
    } catch (error) {
      const err = error as Error;
      toast.error('Audit failed', {
        description: err.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    if (!auditData.summary) return

    const report = {
      ...auditData,
      generated_at: new Date().toISOString(),
      generated_by: 'GMB Dashboard Audit Tool'
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gmb-audit-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.success('Report downloaded')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'WARNING':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
      case 'INFO':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      default:
        return 'bg-green-500/20 text-green-500 border-green-500/30'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Authentication':
        return <Shield className="h-4 w-4" />
      case 'Data Integrity':
        return <Database className="h-4 w-4" />
      case 'Configuration':
        return <Settings className="h-4 w-4" />
      case 'Data Freshness':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              GMB Dashboard Audit
            </CardTitle>
            <CardDescription className="mt-1">
              Run comprehensive checks on your GMB integration
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {auditData.summary && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
            <Button
              onClick={runAudit}
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run Audit
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!auditData.summary && !loading && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Click "Run Audit" to check your GMB dashboard configuration
            </p>
          </div>
        )}

        {auditData.summary && (
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="issues">
                Issues
                {auditData.summary.total_issues > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {auditData.summary.total_issues}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className={cn(
                  "border",
                  auditData.summary.critical_count > 0 
                    ? "border-red-500/30 bg-red-500/5" 
                    : "border-primary/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Critical</p>
                        <p className="text-2xl font-bold text-red-500">
                          {auditData.summary.critical_count}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border",
                  auditData.summary.warning_count > 0 
                    ? "border-yellow-500/30 bg-yellow-500/5" 
                    : "border-primary/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-500">
                          {auditData.summary.warning_count}
                        </p>
                      </div>
                      <Info className="h-8 w-8 text-yellow-500/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Info</p>
                        <p className="text-2xl font-bold text-blue-500">
                          {auditData.summary.info_count}
                        </p>
                      </div>
                      <Info className="h-8 w-8 text-blue-500/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border",
                  auditData.summary.security_status === 'OK'
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Security</p>
                        <p className="text-lg font-bold">
                          {auditData.summary.security_status}
                        </p>
                      </div>
                      <Shield className={cn(
                        "h-8 w-8",
                        auditData.summary.security_status === 'OK'
                          ? "text-green-500/20"
                          : "text-red-500/20"
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Audit Metadata */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last audit run:</span>
                    <span className="font-medium">
                      {new Date(auditData.summary.timestamp).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {auditData.results.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="text-sm font-medium text-green-500">
                      No issues found!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your GMB dashboard is configured correctly
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditData.results.map((result, index) => (
                      <Alert key={index} className={cn(
                        "border",
                        result.severity === 'CRITICAL' && "border-red-500/30",
                        result.severity === 'WARNING' && "border-yellow-500/30",
                        result.severity === 'INFO' && "border-blue-500/30"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 mt-0.5">
                            {getCategoryIcon(result.category)}
                            <Badge className={cn("text-xs", getSeverityColor(result.severity))}>
                              {result.severity}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <AlertTitle className="text-sm font-medium">
                              {result.issue}
                            </AlertTitle>
                            <AlertDescription className="mt-1 text-xs">
                              <span className="text-muted-foreground">
                                {result.category} • {result.count} affected
                              </span>
                              {result.details && Array.isArray(result.details) && (
                                <div className="mt-2 text-xs">
                                  <span className="text-muted-foreground">Details: </span>
                                  {result.details.slice(0, 3).map((d: { name?: string; id?: string }) => d.name || d.id).join(', ')}
                                  {result.details.length > 3 && ` +${result.details.length - 3} more`}
                                </div>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Data Volume Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(auditData.summary.data_volume).map(([table, count]) => (
                      <div key={table} className="flex items-center justify-between py-2 border-b border-primary/10 last:border-0">
                        <span className="text-sm text-muted-foreground">
                          {table.replace('gmb_', '').replace('_', ' ').charAt(0).toUpperCase() + 
                           table.replace('gmb_', '').replace('_', ' ').slice(1)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {count.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {auditData.summary.recommendations.length === 0 ? (
                <Alert className="border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>No actions required</AlertTitle>
                  <AlertDescription>
                    Your GMB dashboard is properly configured and running smoothly.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {auditData.summary.recommendations.map((rec, index) => (
                    <Alert key={index} className="border-primary/30">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <AlertDescription className="ml-2">
                        {rec}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
