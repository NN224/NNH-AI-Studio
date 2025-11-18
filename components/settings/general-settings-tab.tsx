"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Building2, Clock, CheckCircle, Globe } from "lucide-react"

interface GMBAccount {
  id: string;
  account_name?: string;
  is_active: boolean;
  last_sync?: string;
}

interface GeneralSettingsTabProps {
  // Sync & Publishing
  syncSchedule: string
  setSyncSchedule: (value: string) => void
  autoPublish: boolean
  setAutoPublish: (value: boolean) => void
  
  // Business Information
  businessName: string
  setBusinessName: (value: string) => void
  primaryCategory: string
  setPrimaryCategory: (value: string) => void
  businessDescription: string
  setBusinessDescription: (value: string) => void
  defaultReplyTemplate: string
  setDefaultReplyTemplate: (value: string) => void
  timezone: string
  setTimezone: (value: string) => void
  language: string
  setLanguage: (value: string) => void
  
  gmbAccounts: GMBAccount[]
}

export function GeneralSettingsTab({
  syncSchedule,
  setSyncSchedule,
  autoPublish,
  setAutoPublish,
  businessName,
  setBusinessName,
  primaryCategory,
  setPrimaryCategory,
  businessDescription,
  setBusinessDescription,
  defaultReplyTemplate,
  setDefaultReplyTemplate,
  timezone,
  setTimezone,
  language,
  setLanguage,
  gmbAccounts
}: GeneralSettingsTabProps) {
  const activeAccounts = gmbAccounts?.filter((a) => a && a.is_active) || []

  return (
    <div className="space-y-6">
      {/* Business Information */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Information
          </CardTitle>
          <CardDescription>
            Update your business details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-name">{t('businessName')}</Label>
              <Input 
                id="business-name" 
                placeholder={t('businessInfo.namePlaceholder')} 
                className="bg-secondary border-primary/30"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('businessInfo.nameHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary-category">{t('primaryCategory')}</Label>
              <Select value={primaryCategory} onValueChange={setPrimaryCategory}>
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue placeholder={t('businessInfo.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="retail">Retail Store</SelectItem>
                  <SelectItem value="service">Service Business</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="hotel">Hotel & Lodging</SelectItem>
                  <SelectItem value="professional">Professional Services</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-desc">{t('businessDescription')}</Label>
            <Textarea 
              id="business-desc"
              placeholder={t('businessInfo.descriptionPlaceholder')}
              className="bg-secondary border-primary/30 min-h-[80px]"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('businessInfo.descriptionHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-reply">{t('defaultReplyTemplate')}</Label>
            <Textarea 
              id="default-reply"
              placeholder={t('businessInfo.replyPlaceholder')}
              className="bg-secondary border-primary/30 min-h-[100px]"
              value={defaultReplyTemplate}
              onChange={(e) => setDefaultReplyTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('businessInfo.replyHint')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('timezone')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="america/new_york">Eastern Time (ET)</SelectItem>
                  <SelectItem value="america/chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="america/denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="america/los_angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="europe/london">London (GMT)</SelectItem>
                  <SelectItem value="asia/dubai">Dubai (GST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('language')}</Label>
              <Select value="en" disabled>
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue placeholder="English" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      English
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Interface language is English only</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Sync Scheduling */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('syncSchedule.title')}
          </CardTitle>
          <CardDescription>
            {t('syncSchedule.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sync-schedule">{t('syncSchedule.frequency')}</Label>
            <Select value={syncSchedule} onValueChange={setSyncSchedule}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue placeholder={t('syncSchedule.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex items-center justify-between w-full">
                    <span>{t('syncSchedule.manual')}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">{t('syncSchedule.recommended')}</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="hourly">{t('syncSchedule.hourly')}</SelectItem>
                <SelectItem value="daily">{t('syncSchedule.daily')}</SelectItem>
                <SelectItem value="twice-daily">{t('syncSchedule.twiceDaily')}</SelectItem>
                <SelectItem value="weekly">{t('syncSchedule.weekly')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sync Description */}
            <div className="p-3 bg-secondary/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {syncSchedule === 'manual' && t('syncSchedule.descriptions.manual')}
                {syncSchedule === 'hourly' && t('syncSchedule.descriptions.hourly')}
                {syncSchedule === 'daily' && t('syncSchedule.descriptions.daily')}
                {syncSchedule === 'twice-daily' && t('syncSchedule.descriptions.twiceDaily')}
                {syncSchedule === 'weekly' && t('syncSchedule.descriptions.weekly')}
              </p>
            </div>
          </div>

          {syncSchedule !== 'manual' && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-foreground">{t('syncSchedule.autoSyncEnabled')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('syncSchedule.autoSyncDescription')}
              </p>
            </div>
          )}

          {/* Last Sync Status */}
          {activeAccounts.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-primary/20">
              <Label className="text-sm font-medium">{t('syncSchedule.recentActivity')}</Label>
              <div className="space-y-2">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between text-sm p-2 bg-secondary/30 rounded">
                    <span className="text-muted-foreground">
                      {account.account_name || t('syncSchedule.gmbAccount')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {account.last_sync 
                        ? new Date(account.last_sync).toLocaleString() 
                        : t('syncSchedule.neverSynced')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publishing Settings */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle>{t('publishing.title')}</CardTitle>
          <CardDescription>
            {t('publishing.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-publish">{t('autoPublish')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('publishing.autoPublishDescription')}
              </p>
            </div>
            <Switch 
              id="auto-publish"
              checked={autoPublish}
              onCheckedChange={setAutoPublish}
            />
          </div>

          {autoPublish && (
            <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                {t('publishing.warning')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
