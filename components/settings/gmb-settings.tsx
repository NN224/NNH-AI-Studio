"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Shield, Globe, Sparkles, Bell, Database } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { DataManagement } from "./data-management"
import { AccountConnectionTab } from "./account-connection-tab"
import { GeneralSettingsTab } from "./general-settings-tab"
import { AIAutomationTab } from "./ai-automation-tab"
import { NotificationsTab } from "./notifications-tab"
import { GMBAuditPanel } from "./gmb-audit-panel"
import { SettingsTestPanel } from "./settings-test-panel"
import { SecurityReviewPanel } from "./security-review-panel"

export function GMBSettings() {
  const supabase = createClient()
  const router = useRouter()
  
  // State management
  const [autoReply, setAutoReply] = useState(false)
  const [reviewNotifications, setReviewNotifications] = useState(true)
  const [emailDigest, setEmailDigest] = useState("daily")
  const [aiResponseTone, setAiResponseTone] = useState("professional")
  const [autoPublish, setAutoPublish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gmbAccounts, setGmbAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncSchedule, setSyncSchedule] = useState<string>('manual')
  const [syncSettings, setSyncSettings] = useState<any>({})

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
          setLoading(false)
          return
        }

        const accountsArray = accounts || []
        setGmbAccounts(accountsArray)
        
        // Load sync settings from first active account
        const activeAccounts = accountsArray.filter((acc: any) => acc && acc.is_active) || []
        if (activeAccounts.length > 0 && activeAccounts[0] && activeAccounts[0].settings) {
          const settings = activeAccounts[0].settings
          if (settings && typeof settings === 'object') {
            setSyncSettings(settings)
            setSyncSchedule(settings.syncSchedule || 'manual')
            setAutoReply(settings.autoReply || false)
            setReviewNotifications(settings.reviewNotifications !== false)
            setEmailDigest(settings.emailDigest || 'daily')
            setAiResponseTone(settings.aiResponseTone || 'professional')
            setAutoPublish(settings.autoPublish || false)
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

  // Save settings
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
        toast.info('No active GMB accounts found. Connect an account first.')
        setSaving(false)
        return
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
      toast.success("Settings saved successfully!", {
        description: "Your preferences have been updated."
      })
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error("Failed to save settings", {
        description: error.message || 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  // Callback after GMB operations
  const handleGMBSuccess = async () => {
    // Refresh accounts list
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: accounts } = await supabase
        .from('gmb_accounts')
        .select('id, account_name, is_active, last_sync, settings')
        .eq('user_id', user.id)
      setGmbAccounts(accounts || [])
    }
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your Google My Business integration and platform preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-secondary/50">
          <TabsTrigger value="account" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI & Auto</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Account & Connection Tab */}
        <TabsContent value="account" className="space-y-6">
          <AccountConnectionTab 
            gmbAccounts={gmbAccounts}
            onSuccess={handleGMBSuccess}
          />
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <GeneralSettingsTab
            syncSchedule={syncSchedule}
            setSyncSchedule={setSyncSchedule}
            autoPublish={autoPublish}
            setAutoPublish={setAutoPublish}
            gmbAccounts={gmbAccounts}
          />
        </TabsContent>

        {/* AI & Automation Tab */}
        <TabsContent value="ai" className="space-y-6">
          <AIAutomationTab
            aiResponseTone={aiResponseTone}
            setAiResponseTone={setAiResponseTone}
            autoReply={autoReply}
            setAutoReply={setAutoReply}
          />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab
            reviewNotifications={reviewNotifications}
            setReviewNotifications={setReviewNotifications}
            emailDigest={emailDigest}
            setEmailDigest={setEmailDigest}
          />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <DataManagement accountId={gmbAccounts.find(acc => acc.is_active)?.id} />
          
          {/* Audit Panel */}
          <GMBAuditPanel />
          
          {/* Settings Test Panel */}
          <SettingsTestPanel />
          
          {/* Security Review Panel */}
          <SecurityReviewPanel />
        </TabsContent>
      </Tabs>

      {/* Save Button - Fixed at bottom */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-primary/20 pt-4">
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg"
          >
            <Save className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
