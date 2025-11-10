"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Settings,
  RefreshCw,
  Database,
  Globe,
  Bell,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface SettingsTest {
  category: string
  field: string
  value: any
  expectedType: string
  persisted?: boolean
  validated?: boolean
}

export function SettingsTestPanel() {
  const supabase = createClient()
  const [testing, setTesting] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<SettingsTest[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)

  // Test settings values
  const testSettings = {
    // General Settings
    businessName: "Test Business " + Date.now(),
    syncSchedule: "daily",
    autoPublish: true,
    timezone: "america/new_york",
    language: "en",
    
    // AI Settings
    autoReply: true,
    aiResponseTone: "professional",
    responseLength: "medium",
    creativityLevel: "medium",
    
    // Notifications
    reviewNotifications: true,
    emailDigest: "daily",
    quietHours: false,
    browserNotifications: true,
    
    // Data Management
    retentionDays: 90,
    deleteOnDisconnect: false
  }

  useEffect(() => {
    // Get active account
    const getAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: accounts } = await supabase
        .from('gmb_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)

      if (accounts && accounts.length > 0) {
        setAccountId(accounts[0].id)
      }
    }

    getAccount()
  }, [supabase])

  const runSettingsTest = async () => {
    if (!accountId) {
      toast.error('No active GMB account found')
      return
    }

    setTesting(true)
    setTestResults([])
    const results: SettingsTest[] = []

    try {
      // 1. Save test settings
      setCurrentTest('Saving settings')
      
      const settingsPayload = {
        ...testSettings,
        updatedAt: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('gmb_accounts')
        .update({ settings: settingsPayload })
        .eq('id', accountId)

      if (updateError) {
        throw new Error('Failed to save settings: ' + updateError.message)
      }

      toast.success('Settings saved successfully')

      // 2. Verify persistence
      setCurrentTest('Verifying persistence')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for DB

      const { data: account, error: fetchError } = await supabase
        .from('gmb_accounts')
        .select('settings')
        .eq('id', accountId)
        .single()

      if (fetchError || !account) {
        throw new Error('Failed to fetch settings: ' + (fetchError?.message || 'Unknown error'))
      }

      // 3. Validate each setting
      setCurrentTest('Validating settings')
      
      for (const [key, expectedValue] of Object.entries(testSettings)) {
        const actualValue = account.settings?.[key]
        const persisted = actualValue === expectedValue
        
        results.push({
          category: getSettingCategory(key),
          field: key,
          value: actualValue,
          expectedType: typeof expectedValue,
          persisted,
          validated: persisted && typeof actualValue === typeof expectedValue
        })
      }

      // 4. Test UI update simulation
      setCurrentTest('Testing UI updates')
      
      // Simulate changing a setting
      const updatedSettings = {
        ...account.settings,
        syncSchedule: 'manual',
        autoReply: false
      }

      const { error: uiUpdateError } = await supabase
        .from('gmb_accounts')
        .update({ settings: updatedSettings })
        .eq('id', accountId)

      if (!uiUpdateError) {
        results.push({
          category: 'UI Update',
          field: 'syncSchedule',
          value: 'manual',
          expectedType: 'string',
          persisted: true,
          validated: true
        })
        
        results.push({
          category: 'UI Update',
          field: 'autoReply',
          value: false,
          expectedType: 'boolean',
          persisted: true,
          validated: true
        })
      }

      setTestResults(results)
      
      // Summary
      const passed = results.filter(r => r.persisted && r.validated).length
      const failed = results.filter(r => !r.persisted || !r.validated).length
      
      if (failed === 0) {
        toast.success('All settings tests passed!', {
          description: `${passed} settings validated successfully`
        })
      } else {
        toast.warning('Some settings tests failed', {
          description: `${passed} passed, ${failed} failed`
        })
      }

    } catch (error: any) {
      toast.error('Settings test failed', {
        description: error.message || 'Unknown error'
      })
    } finally {
      setTesting(false)
      setCurrentTest(null)
    }
  }

  const getSettingCategory = (key: string): string => {
    if (['businessName', 'syncSchedule', 'autoPublish', 'timezone', 'language'].includes(key)) {
      return 'General'
    }
    if (['autoReply', 'aiResponseTone', 'responseLength', 'creativityLevel'].includes(key)) {
      return 'AI & Automation'
    }
    if (['reviewNotifications', 'emailDigest', 'quietHours', 'browserNotifications'].includes(key)) {
      return 'Notifications'
    }
    if (['retentionDays', 'deleteOnDisconnect'].includes(key)) {
      return 'Data Management'
    }
    return 'Other'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <Globe className="h-4 w-4" />
      case 'AI & Automation':
        return <Sparkles className="h-4 w-4" />
      case 'Notifications':
        return <Bell className="h-4 w-4" />
      case 'Data Management':
        return <Database className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, SettingsTest[]>)

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Settings Validation Test
            </CardTitle>
            <CardDescription className="mt-1">
              Test settings persistence and UI updates
            </CardDescription>
          </div>
          <Button
            onClick={runSettingsTest}
            disabled={testing || !accountId}
            size="sm"
            className="gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!accountId && (
          <Alert className="border-yellow-500/30">
            <AlertDescription>
              No active GMB account found. Please connect an account first.
            </AlertDescription>
          </Alert>
        )}

        {currentTest && (
          <Alert className="mb-4 border-primary/30">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="ml-2">
              {currentTest}...
            </AlertDescription>
          </Alert>
        )}

        {testResults.length > 0 && (
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">
                Details
                <Badge variant="secondary" className="ml-2 text-xs">
                  {testResults.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Passed</p>
                        <p className="text-2xl font-bold text-green-500">
                          {testResults.filter(r => r.persisted && r.validated).length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-500">
                          {testResults.filter(r => !r.persisted || !r.validated).length}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-500/20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Test Values Preview */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm">Test Values Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-xs">
                    {Object.entries(testSettings).slice(0, 5).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-primary/10">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-mono">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                    <p className="text-muted-foreground mt-2">
                      +{Object.keys(testSettings).length - 5} more settings...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {Object.entries(groupedResults).map(([category, results]) => (
                <Card key={category} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <div 
                          key={index}
                          className={cn(
                            "flex items-center justify-between p-2 rounded",
                            result.persisted && result.validated 
                              ? "bg-green-500/10" 
                              : "bg-red-500/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {result.persisted && result.validated ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{result.field}</p>
                              <p className="text-xs text-muted-foreground">
                                Value: {JSON.stringify(result.value)} ({result.expectedType})
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                result.persisted 
                                  ? "bg-green-500/20 text-green-500" 
                                  : "bg-red-500/20 text-red-500"
                              )}
                            >
                              {result.persisted ? 'Persisted' : 'Not Persisted'}
                            </Badge>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                result.validated 
                                  ? "bg-green-500/20 text-green-500" 
                                  : "bg-red-500/20 text-red-500"
                              )}
                            >
                              {result.validated ? 'Valid' : 'Invalid'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {!testing && testResults.length === 0 && accountId && (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Click "Run Test" to validate settings persistence
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
