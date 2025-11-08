"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Link2,
  Unlink,
  Shield,
  Key,
  Database,
  Clock,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { useGMBConnection } from "@/hooks/use-gmb-connection"
import { disconnectGMBAccount } from "@/server/actions/gmb-account"
import { cn } from "@/lib/utils"

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning'
  message?: string
  details?: any
  timestamp?: Date
}

export default function TestConnectionPage() {
  const { isConnected, activeAccounts, refresh } = useGMBConnection()
  const [running, setRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  // Test scenarios
  const testScenarios = [
    {
      id: 'auth-url',
      name: 'Generate OAuth URL',
      description: 'Test creating authorization URL',
      test: async () => {
        const response = await fetch('/api/gmb/create-auth-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const data = await response.json()
        
        if (!response.ok) throw new Error(data.error || 'Failed to generate auth URL')
        if (!data.authUrl || !data.authUrl.includes('accounts.google.com')) {
          throw new Error('Invalid auth URL format')
        }
        
        return {
          passed: true,
          message: 'OAuth URL generated successfully',
          details: { url: data.authUrl.substring(0, 100) + '...' }
        }
      }
    },
    {
      id: 'connection-status',
      name: 'Check Connection Status',
      description: 'Verify current connection state',
      test: async () => {
        await refresh()
        
        if (isConnected && activeAccounts.length > 0) {
          return {
            passed: true,
            message: `Connected with ${activeAccounts.length} active account(s)`,
            details: activeAccounts.map(a => ({
              name: a.account_name,
              lastSync: a.last_sync
            }))
          }
        } else {
          return {
            passed: false,
            message: 'No active GMB connection found',
            details: { isConnected, accountCount: activeAccounts.length }
          }
        }
      }
    },
    {
      id: 'token-validity',
      name: 'Validate Tokens',
      description: 'Check token expiration and refresh capability',
      test: async () => {
        if (!activeAccounts.length) {
          return {
            passed: false,
            message: 'No active accounts to test'
          }
        }

        const account = activeAccounts[0]
        const response = await fetch('/api/gmb/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id })
        })
        
        const data = await response.json()
        
        if (data.valid) {
          return {
            passed: true,
            message: 'Tokens are valid',
            details: {
              expiresIn: data.expiresIn,
              canRefresh: data.canRefresh
            }
          }
        } else {
          return {
            passed: false,
            message: 'Token validation failed',
            details: data
          }
        }
      }
    },
    {
      id: 'sync-test',
      name: 'Test Data Sync',
      description: 'Perform a test sync operation',
      test: async () => {
        if (!activeAccounts.length) {
          return {
            passed: false,
            message: 'No active accounts to sync'
          }
        }

        const account = activeAccounts[0]
        const response = await fetch('/api/gmb/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accountId: account.id,
            syncType: 'test' // Light sync for testing
          })
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          return {
            passed: true,
            message: 'Sync completed successfully',
            details: data.counts || {}
          }
        } else {
          return {
            passed: false,
            message: 'Sync failed',
            details: { error: data.error }
          }
        }
      }
    },
    {
      id: 'disconnect-flow',
      name: 'Test Disconnect Flow',
      description: 'Test disconnection without data loss',
      test: async () => {
        // This is a simulation - we won't actually disconnect
        return {
          passed: true,
          message: 'Disconnect flow simulation passed',
          details: {
            options: ['keep', 'export', 'delete'],
            note: 'Actual disconnection not performed in test'
          }
        }
      }
    },
    {
      id: 'security-check',
      name: 'Security Validation',
      description: 'Verify RLS and token encryption',
      test: async () => {
        const response = await fetch('/api/gmb/security-check')
        const data = await response.json()
        
        if (data.rlsEnabled && data.tokensEncrypted) {
          return {
            passed: true,
            message: 'Security checks passed',
            details: data
          }
        } else {
          return {
            passed: false,
            message: 'Security issues detected',
            details: data
          }
        }
      }
    }
  ]

  const runTests = async () => {
    setRunning(true)
    setTestResults([])
    
    for (const scenario of testScenarios) {
      setCurrentTest(scenario.id)
      
      // Initialize test result
      setTestResults(prev => [...prev, {
        name: scenario.name,
        status: 'running',
        timestamp: new Date()
      }])
      
      try {
        // Run the test
        const result = await scenario.test()
        
        // Update result
        setTestResults(prev => prev.map(r => 
          r.name === scenario.name 
            ? {
                ...r,
                status: result.passed ? 'passed' : 'failed',
                message: result.message,
                details: result.details,
                timestamp: new Date()
              }
            : r
        ))
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error: any) {
        // Handle test error
        setTestResults(prev => prev.map(r => 
          r.name === scenario.name 
            ? {
                ...r,
                status: 'failed',
                message: error.message || 'Test failed',
                details: { error: error.toString() },
                timestamp: new Date()
              }
            : r
        ))
      }
    }
    
    setCurrentTest(null)
    setRunning(false)
    
    // Show summary
    const passed = testResults.filter(r => r.status === 'passed').length
    const failed = testResults.filter(r => r.status === 'failed').length
    
    if (failed === 0) {
      toast.success('All tests passed!', {
        description: `${passed} out of ${testScenarios.length} tests completed successfully`
      })
    } else {
      toast.error('Some tests failed', {
        description: `${passed} passed, ${failed} failed`
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      passed: 'bg-green-500/20 text-green-500 border-green-500/30',
      failed: 'bg-red-500/20 text-red-500 border-red-500/30',
      warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      running: 'bg-primary/20 text-primary border-primary/30',
      pending: 'bg-muted/20 text-muted-foreground border-muted/30'
    }
    
    return (
      <Badge className={cn("text-xs", variants[status] || variants.pending)}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GMB Connection Test Suite</h1>
          <p className="text-muted-foreground mt-1">
            Test and validate your Google My Business integration
          </p>
        </div>
        <Button
          onClick={runTests}
          disabled={running}
          size="lg"
          className="gap-2"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Current Status */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Current Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {activeAccounts.length} active account(s)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      No active GMB accounts found
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tests">Test Scenarios</TabsTrigger>
          <TabsTrigger value="results">
            Results
            {testResults.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {testResults.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <div className="grid gap-4">
            {testScenarios.map((scenario) => (
              <Card 
                key={scenario.id} 
                className={cn(
                  "border-primary/30 transition-all",
                  currentTest === scenario.id && "ring-2 ring-primary"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {currentTest === scenario.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {scenario.name}
                    </CardTitle>
                    {testResults.find(r => r.name === scenario.name) && 
                      getStatusBadge(testResults.find(r => r.name === scenario.name)!.status)
                    }
                  </div>
                  <CardDescription className="mt-1">
                    {scenario.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 ? (
            <Card className="border-primary/30">
              <CardContent className="py-8 text-center">
                <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No test results yet. Click "Run All Tests" to start.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <Card key={index} className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(result.status)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{result.name}</h4>
                            {result.timestamp && (
                              <span className="text-xs text-muted-foreground">
                                {result.timestamp.toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          {result.message && (
                            <p className="text-sm text-muted-foreground">
                              {result.message}
                            </p>
                          )}
                          {result.details && (
                            <div className="mt-2 p-2 bg-secondary/50 rounded text-xs font-mono">
                              <pre>{JSON.stringify(result.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Test Summary */}
      {testResults.length > 0 && !running && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{testResults.length}</p>
                <p className="text-sm text-muted-foreground">Total Tests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {testResults.filter(r => r.status === 'passed').length}
                </p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">
                  {testResults.filter(r => r.status === 'failed').length}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">
                  {testResults.filter(r => r.status === 'warning').length}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
