"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Save, Bell, Globe, Key, Users, CreditCard, Shield, Link2, Sparkles, Clock, CheckCircle, Unlink, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function GMBSettings() {
  const supabase = createClient()
  const router = useRouter()
  const [autoReply, setAutoReply] = useState(false)
  const [reviewNotifications, setReviewNotifications] = useState(true)
  const [emailDigest, setEmailDigest] = useState("daily")
  const [aiResponseTone, setAiResponseTone] = useState("professional")
  const [autoPublish, setAutoPublish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gmbConnected, setGmbConnected] = useState(false)
  const [gmbAccounts, setGmbAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncSchedule, setSyncSchedule] = useState<string>('manual')
  const [syncSettings, setSyncSettings] = useState<any>({})
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  // Check GMB connection status
  useEffect(() => {
    const checkGMBConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: accounts, error } = await supabase
          .from('gmb_accounts')
          .select('id, account_name, is_active, last_sync, settings')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching GMB accounts:', error)
          setGmbAccounts([])
          setGmbConnected(false)
          setLoading(false)
          return
        }

        const accountsArray = accounts || []
        const activeAccounts = accountsArray.filter((acc: any) => acc && acc.is_active) || []
        setGmbAccounts(accountsArray)
        setGmbConnected(activeAccounts.length > 0)
        
        // Load sync settings from first active account
        if (activeAccounts.length > 0 && activeAccounts[0] && activeAccounts[0].settings) {
          const settings = activeAccounts[0].settings
          if (settings && typeof settings === 'object') {
            setSyncSettings(settings)
            setSyncSchedule(settings.syncSchedule || 'manual')
          }
        }
      } catch (error) {
        console.error('Error checking GMB connection:', error)
      } finally {
        setLoading(false)
      }
    }

    checkGMBConnection()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Update sync settings for all active accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('gmb_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (accountsError) {
        throw new Error(accountsError.message)
      }

      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No active GMB accounts found')
      }

      // Update each account's settings
      const updatedSettings = {
        ...syncSettings,
        syncSchedule,
        autoReply,
        reviewNotifications,
        emailDigest,
        aiResponseTone,
        autoPublish,
        updatedAt: new Date().toISOString()
      }

      for (const account of accounts) {
        if (!account || !account.id) continue
        
        const { error: updateError } = await supabase
          .from('gmb_accounts')
          .update({ settings: updatedSettings })
          .eq('id', account.id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Error updating account settings:', updateError)
          throw new Error(updateError.message || 'Failed to update settings')
        }
      }

      setSyncSettings(updatedSettings)
      toast.success("Settings saved successfully")
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnectGMB = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch('/api/gmb/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }

      toast.success('Google My Business disconnected successfully')
      setGmbConnected(false)
      setShowDisconnectDialog(false)
      // Refresh accounts list
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: accounts, error: accountsError } = await supabase
          .from('gmb_accounts')
          .select('id, account_name, is_active, last_sync')
          .eq('user_id', user.id)
        
        if (accountsError) {
          console.error('Error refreshing accounts:', accountsError)
        } else {
          setGmbAccounts(accounts || [])
        }
      }
    } catch (error: any) {
      console.error('Error disconnecting GMB:', error)
      toast.error(error.message || 'Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleConnectGMB = async () => {
    try {
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create auth URL')
      }

      // Redirect to Google OAuth
      const authUrl = data.authUrl || data.url
      if (authUrl) {
        router.push(authUrl)
      } else {
        throw new Error('No authorization URL received')
      }
    } catch (error: any) {
      console.error('Error connecting GMB:', error)
      toast.error(error.message || 'Failed to connect')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your Google My Business integration settings</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-secondary/50">
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-card border-primary/30">
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input 
                    id="business-name" 
                    placeholder="Your Business Name" 
                    className="bg-secondary border-primary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-category">Primary Category</Label>
                  <Select>
                    <SelectTrigger className="bg-secondary border-primary/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digital-marketing">Digital Marketing</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="retail">Retail Store</SelectItem>
                      <SelectItem value="service">Service Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-reply">Default Reply Template</Label>
                <Textarea 
                  id="default-reply"
                  placeholder="Thank you for your review..."
                  className="bg-secondary border-primary/30 min-h-[100px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-publish">Auto-publish Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically publish approved content to GMB
                  </p>
                </div>
                <Switch 
                  id="auto-publish"
                  checked={autoPublish}
                  onCheckedChange={setAutoPublish}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-Sync Settings */}
          <Card className="bg-card border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Auto-Sync Scheduling
              </CardTitle>
              <CardDescription>
                Configure automatic synchronization of your Google My Business data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sync-schedule">Sync Frequency</Label>
                <Select value={syncSchedule} onValueChange={setSyncSchedule}>
                  <SelectTrigger className="bg-secondary border-primary/30">
                    <SelectValue placeholder="Select sync frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <span>Manual Only</span>
                        <Badge variant="secondary" className="text-xs">You control when to sync</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily (Once per day)</SelectItem>
                    <SelectItem value="twice-daily">Twice Daily (Morning & Evening)</SelectItem>
                    <SelectItem value="weekly">Weekly (Once per week)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {syncSchedule === 'manual' && 'You will need to manually sync your data from the dashboard.'}
                  {syncSchedule === 'hourly' && 'Your data will be synced automatically every hour.'}
                  {syncSchedule === 'daily' && 'Your data will be synced once per day at midnight UTC.'}
                  {syncSchedule === 'twice-daily' && 'Your data will be synced twice per day at 9 AM and 6 PM UTC.'}
                  {syncSchedule === 'weekly' && 'Your data will be synced once per week on Monday at midnight UTC.'}
                </p>
              </div>

              {syncSchedule !== 'manual' && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-foreground">Auto-sync enabled</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your Google My Business data will be automatically synchronized according to your selected schedule.
                    You can still manually sync anytime from the dashboard.
                  </p>
                </div>
              )}

              {Array.isArray(gmbAccounts) && gmbAccounts.length > 0 && gmbAccounts.filter((a: any) => a && a.is_active).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-primary/20">
                  <Label className="text-sm font-medium">Last Sync Status</Label>
                  <div className="space-y-1">
                    {gmbAccounts.filter((a: any) => a && a.is_active).map((account: any) => {
                      if (!account || !account.id) return null
                      return (
                        <div key={account.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{account.account_name || 'GMB Account'}</span>
                          <span className="text-muted-foreground">
                            {account.last_sync 
                              ? new Date(account.last_sync).toLocaleString() 
                              : 'Never synced'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card border-primary/30">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified about GMB activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-notifications">New Review Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive new reviews
                  </p>
                </div>
                <Switch 
                  id="review-notifications"
                  checked={reviewNotifications}
                  onCheckedChange={setReviewNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-reply">Auto-reply to Reviews</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate and send replies to new reviews
                  </p>
                </div>
                <Switch 
                  id="auto-reply"
                  checked={autoReply}
                  onCheckedChange={setAutoReply}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-digest">Email Digest Frequency</Label>
                <Select value={emailDigest} onValueChange={setEmailDigest}>
                  <SelectTrigger className="bg-secondary border-primary/30">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card className="bg-card border-primary/30">
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Customize how AI generates content for your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-tone">Response Tone</Label>
                <Select value={aiResponseTone} onValueChange={setAiResponseTone}>
                  <SelectTrigger className="bg-secondary border-primary/30">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AI Features</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Smart review response generation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Sentiment analysis for reviews</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Content optimization suggestions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Auto-scheduling (Coming Soon)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="space-y-6">
          <Card className="bg-card border-primary/30">
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage your Google My Business API connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Connection Status</Label>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <Badge variant="secondary" className="bg-secondary text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      Checking...
                    </Badge>
                  ) : gmbConnected ? (
                    <>
                      <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                        <Link2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      {Array.isArray(gmbAccounts) && gmbAccounts.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {gmbAccounts.filter((a: any) => a && a.is_active).length} account(s) connected
                        </span>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>

              {Array.isArray(gmbAccounts) && gmbAccounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Connected Accounts</Label>
                  <div className="space-y-2">
                    {gmbAccounts.map((account: any) => {
                      if (!account || !account.id) return null
                      return (
                        <div key={account.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-foreground">{account.account_name || 'GMB Account'}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.is_active ? 'Active' : 'Inactive'}
                              {account.last_sync && ` • Last sync: ${new Date(account.last_sync).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* API Usage tracking disabled for production */}
              {/* Uncomment when implementing proper usage tracking
              <div className="space-y-2">
                <Label>API Usage</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API Calls (This Month)</span>
                    <span className="font-medium">Loading...</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
              </div>
              */}

              <div className="pt-4 space-y-3 border-t border-primary/20">
                {gmbConnected ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                      onClick={() => setShowDisconnectDialog(true)}
                      disabled={disconnecting}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect GMB
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Disconnecting will stop syncing but won't delete your existing data
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto"
                      onClick={handleConnectGMB}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Re-authenticate
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                      onClick={handleConnectGMB}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Connect Google My Business
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Connect your Google My Business account to sync locations, reviews, and insights automatically
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <Card className="bg-card border-primary/30">
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage team members and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Team management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
        >
          <Save className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Google My Business?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect Google My Business? Sync will stop but current data will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDisconnectDialog(false)}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisconnectGMB}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}