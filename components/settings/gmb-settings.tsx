"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Shield, Globe, Sparkles, Bell, Database, Palette } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTranslations } from 'next-intl'
import { DataManagement } from "./data-management"
import { AccountConnectionTab } from "./account-connection-tab"
import { GeneralSettingsTab } from "./general-settings-tab"
import { AIAutomationTab } from "./ai-automation-tab"
import { NotificationsTab } from "./notifications-tab"
import { BrandingTab } from "./branding-tab"
import { GMBAuditPanel } from "./gmb-audit-panel"
import { SettingsTestPanel } from "./settings-test-panel"
import { SecurityReviewPanel } from "./security-review-panel"

interface GMBAccount {
  id: string;
  account_name?: string;
  is_active: boolean;
  last_sync?: string;
  settings?: Record<string, unknown>;
}

export function GMBSettings() {
  const t = useTranslations('Settings')
  const supabase = createClient()
  const router = useRouter()

  // GMB Accounts
  const [gmbAccounts, setGmbAccounts] = useState<GMBAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // General Settings
  const [businessName, setBusinessName] = useState<string>('')
  const [primaryCategory, setPrimaryCategory] = useState<string>('')
  const [businessDescription, setBusinessDescription] = useState<string>('')
  const [defaultReplyTemplate, setDefaultReplyTemplate] = useState<string>('')
  const [timezone, setTimezone] = useState<string>('utc')
  const [language, setLanguage] = useState<string>('en')
  const [syncSchedule, setSyncSchedule] = useState<string>('manual')
  const [autoPublish, setAutoPublish] = useState(false)

  // AI & Automation Settings
  const [autoReply, setAutoReply] = useState(false)
  const [aiResponseTone, setAiResponseTone] = useState("professional")
  const [responseLength, setResponseLength] = useState<string>('medium')
  const [creativityLevel, setCreativityLevel] = useState<string>('medium')

  // Notifications Settings
  const [reviewNotifications, setReviewNotifications] = useState(true)
  const [emailDigest, setEmailDigest] = useState("daily")
  const [emailDeliveryTime, setEmailDeliveryTime] = useState<string>('09:00')
  const [negativePriority, setNegativePriority] = useState(true)
  const [replyReminders, setReplyReminders] = useState(true)
  const [browserNotifications, setBrowserNotifications] = useState(false)
  const [soundAlerts, setSoundAlerts] = useState(false)
  const [quietHours, setQuietHours] = useState(false)
  const [quietHoursStart, setQuietHoursStart] = useState<string>('22:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>('08:00')
  const [notifyReviews, setNotifyReviews] = useState(true)
  const [notifyQuestions, setNotifyQuestions] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState(true)
  const [notifyMentions, setNotifyMentions] = useState(false)
  const [notifyInsights, setNotifyInsights] = useState(true)
  const [notifyTips, setNotifyTips] = useState(false)

  // Data Management Settings
  const [retentionDays, setRetentionDays] = useState<number>(30)
  const [deleteOnDisconnect, setDeleteOnDisconnect] = useState(false)

  // Branding Settings
  const [brandName, setBrandName] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState<string>('#FFA500')
  const [secondaryColor, setSecondaryColor] = useState<string>('#1A1A1A')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)

  // Load all settings from API
  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load GMB accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('gmb_accounts')
        .select('id, account_name, is_active, last_sync, settings')
        .eq('user_id', user.id)

      if (accountsError) {
        console.error('Error fetching GMB accounts:', accountsError)
        setGmbAccounts([])
      } else {
        setGmbAccounts(accounts || [])
      }

      // Load all settings from unified API
      const response = await fetch('/api/settings')
      if (!response.ok) {
        console.error('Failed to load settings')
        setLoading(false)
        return
      }

      const { settings } = await response.json()

      // Set all settings states
      if (settings) {
        // General Settings
        setBusinessName(settings.businessName || '')
        setPrimaryCategory(settings.primaryCategory || '')
        setBusinessDescription(settings.businessDescription || '')
        setDefaultReplyTemplate(settings.defaultReplyTemplate || '')
        setTimezone(settings.timezone || 'utc')
        setLanguage(settings.language || 'en')
        setSyncSchedule(settings.syncSchedule || 'manual')
        setAutoPublish(settings.autoPublish || false)

        // AI & Automation
        setAutoReply(settings.autoReply || false)
        setAiResponseTone(settings.aiResponseTone || 'professional')
        setResponseLength(settings.responseLength || 'medium')
        setCreativityLevel(settings.creativityLevel || 'medium')

        // Notifications
        setReviewNotifications(settings.reviewNotifications !== false)
        setEmailDigest(settings.emailDigest || 'daily')
        setEmailDeliveryTime(settings.emailDeliveryTime || '09:00')
        setNegativePriority(settings.negativePriority !== false)
        setReplyReminders(settings.replyReminders !== false)
        setBrowserNotifications(settings.browserNotifications || false)
        setSoundAlerts(settings.soundAlerts || false)
        setQuietHours(settings.quietHours || false)
        setQuietHoursStart(settings.quietHoursStart || '22:00')
        setQuietHoursEnd(settings.quietHoursEnd || '08:00')
        setNotifyReviews(settings.notifyReviews !== false)
        setNotifyQuestions(settings.notifyQuestions !== false)
        setNotifyMessages(settings.notifyMessages !== false)
        setNotifyMentions(settings.notifyMentions || false)
        setNotifyInsights(settings.notifyInsights !== false)
        setNotifyTips(settings.notifyTips || false)

        // Data Management
        setRetentionDays(settings.retentionDays || 30)
        setDeleteOnDisconnect(settings.deleteOnDisconnect || false)

        // Branding
        if (settings.branding) {
          setBrandName(settings.branding.brandName || '')
          setPrimaryColor(settings.branding.primaryColor || '#FFA500')
          setSecondaryColor(settings.branding.secondaryColor || '#1A1A1A')
          setLogoUrl(settings.branding.logoUrl || null)
          setCoverImageUrl(settings.branding.coverImageUrl || null)
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Save all settings using unified API
  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Check if there's an active account (required for most settings)
      const activeAccounts = gmbAccounts.filter((acc) => acc && acc.is_active) || []
      if (activeAccounts.length === 0) {
        toast.info('No active GMB accounts found. Connect an account first.')
        setSaving(false)
        return
      }

      // Prepare all settings payload
      const settingsPayload = {
        // General Settings
        businessName: businessName || null,
        primaryCategory: primaryCategory || null,
        businessDescription: businessDescription || null,
        defaultReplyTemplate: defaultReplyTemplate || null,
        timezone: timezone || 'utc',
        language: language || 'en',
        syncSchedule: syncSchedule || 'manual',
        autoPublish: autoPublish || false,

        // AI & Automation
        autoReply: autoReply || false,
        aiResponseTone: aiResponseTone || 'professional',
        responseLength: responseLength || 'medium',
        creativityLevel: creativityLevel || 'medium',

        // Notifications
        reviewNotifications: reviewNotifications,
        emailDigest: emailDigest || 'daily',
        emailDeliveryTime: emailDeliveryTime || '09:00',
        negativePriority: negativePriority,
        replyReminders: replyReminders,
        browserNotifications: browserNotifications || false,
        soundAlerts: soundAlerts || false,
        quietHours: quietHours || false,
        quietHoursStart: quietHoursStart || '22:00',
        quietHoursEnd: quietHoursEnd || '08:00',
        notifyReviews: notifyReviews,
        notifyQuestions: notifyQuestions,
        notifyMessages: notifyMessages,
        notifyMentions: notifyMentions || false,
        notifyInsights: notifyInsights,
        notifyTips: notifyTips || false,

        // Data Management
        retentionDays: retentionDays || 30,
        deleteOnDisconnect: deleteOnDisconnect || false,

        // Branding
        branding: {
          brandName: brandName || null,
          primaryColor: primaryColor || '#FFA500',
          secondaryColor: secondaryColor || '#1A1A1A',
          logoUrl: logoUrl || null,
          coverImageUrl: coverImageUrl || null,
        },
      }

      // Save using unified API
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsPayload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      toast.success(t('saved'), {
        description: "All your preferences have been updated."
      })

      // Reload settings to ensure consistency
      await loadSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      const err = error as Error;
      toast.error(t('saveError'), {
        description: err.message || 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  // Callback after GMB operations
  const handleGMBSuccess = async () => {
    // Reload all settings and accounts
    await loadSettings()
    router.refresh()
  }

  const hasAccounts = gmbAccounts.length > 0
  const firstTab = hasAccounts ? "account" : "branding"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Tabs */}
      <Tabs defaultValue={firstTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-secondary/50" role="tablist">
          <TabsTrigger
            value="account"
            className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            disabled={!hasAccounts}
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('general.account')}</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Palette className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('branding.title')}</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('general.title')}</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('ai.title')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('notifications.title')}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Database className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('data.title')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6" role="tabpanel">
          <AccountConnectionTab 
            gmbAccounts={gmbAccounts}
            onSuccess={handleGMBSuccess}
          />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6" role="tabpanel">
          <BrandingTab 
            onSave={() => {
              window.dispatchEvent(new Event('brand-profile-updated'));
              router.refresh();
            }}
            brandName={brandName}
            setBrandName={setBrandName}
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            secondaryColor={secondaryColor}
            setSecondaryColor={setSecondaryColor}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            coverImageUrl={coverImageUrl}
            setCoverImageUrl={setCoverImageUrl}
          />
        </TabsContent>

        <TabsContent value="general" className="space-y-6" role="tabpanel">
          <GeneralSettingsTab
            syncSchedule={syncSchedule}
            setSyncSchedule={setSyncSchedule}
            autoPublish={autoPublish}
            setAutoPublish={setAutoPublish}
            businessName={businessName}
            setBusinessName={setBusinessName}
            primaryCategory={primaryCategory}
            setPrimaryCategory={setPrimaryCategory}
            businessDescription={businessDescription}
            setBusinessDescription={setBusinessDescription}
            defaultReplyTemplate={defaultReplyTemplate}
            setDefaultReplyTemplate={setDefaultReplyTemplate}
            timezone={timezone}
            setTimezone={setTimezone}
            language={language}
            setLanguage={setLanguage}
            gmbAccounts={gmbAccounts}
          />
        </TabsContent>

        <TabsContent value="ai" className="space-y-6" role="tabpanel">
          <AIAutomationTab
            aiResponseTone={aiResponseTone}
            setAiResponseTone={setAiResponseTone}
            autoReply={autoReply}
            setAutoReply={setAutoReply}
            responseLength={responseLength}
            setResponseLength={setResponseLength}
            creativityLevel={creativityLevel}
            setCreativityLevel={setCreativityLevel}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6" role="tabpanel">
          <NotificationsTab
            reviewNotifications={reviewNotifications}
            setReviewNotifications={setReviewNotifications}
            emailDigest={emailDigest}
            setEmailDigest={setEmailDigest}
            emailDeliveryTime={emailDeliveryTime}
            setEmailDeliveryTime={setEmailDeliveryTime}
            negativePriority={negativePriority}
            setNegativePriority={setNegativePriority}
            replyReminders={replyReminders}
            setReplyReminders={setReplyReminders}
            browserNotifications={browserNotifications}
            setBrowserNotifications={setBrowserNotifications}
            soundAlerts={soundAlerts}
            setSoundAlerts={setSoundAlerts}
            quietHours={quietHours}
            setQuietHours={setQuietHours}
            quietHoursStart={quietHoursStart}
            setQuietHoursStart={setQuietHoursStart}
            quietHoursEnd={quietHoursEnd}
            setQuietHoursEnd={setQuietHoursEnd}
            notifyReviews={notifyReviews}
            setNotifyReviews={setNotifyReviews}
            notifyQuestions={notifyQuestions}
            setNotifyQuestions={setNotifyQuestions}
            notifyMessages={notifyMessages}
            setNotifyMessages={setNotifyMessages}
            notifyMentions={notifyMentions}
            setNotifyMentions={setNotifyMentions}
            notifyInsights={notifyInsights}
            setNotifyInsights={setNotifyInsights}
            notifyTips={notifyTips}
            setNotifyTips={setNotifyTips}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6" role="tabpanel">
          <DataManagement 
            accountId={gmbAccounts.find(acc => acc.is_active)?.id}
            retentionDays={retentionDays}
            setRetentionDays={setRetentionDays}
            deleteOnDisconnect={deleteOnDisconnect}
            setDeleteOnDisconnect={setDeleteOnDisconnect}
          />

          <GMBAuditPanel />

          <SettingsTestPanel />

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
            {saving ? t('saving') : t('saveAllChanges')}
          </Button>
        </div>
      </div>
    </div>
  )
}
