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
  syncSchedule: string
  setSyncSchedule: (value: string) => void
  autoPublish: boolean
  setAutoPublish: (value: boolean) => void
  gmbAccounts: GMBAccount[]
}

export function GeneralSettingsTab({
  syncSchedule,
  setSyncSchedule,
  autoPublish,
  setAutoPublish,
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
              <Label htmlFor="business-name">Business Name</Label>
              <Input 
                id="business-name" 
                placeholder="Your Business Name" 
                className="bg-secondary border-primary/30"
              />
              <p className="text-xs text-muted-foreground">
                This will be used as the default name across the platform
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary-category">Primary Category</Label>
              <Select>
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue placeholder="Select category" />
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
            <Label htmlFor="business-desc">Business Description</Label>
            <Textarea 
              id="business-desc"
              placeholder="Describe your business in a few sentences..."
              className="bg-secondary border-primary/30 min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              This helps AI generate better content tailored to your business
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-reply">Default Reply Template</Label>
            <Textarea 
              id="default-reply"
              placeholder="Thank you for your review! We appreciate your feedback and hope to serve you again soon."
              className="bg-secondary border-primary/30 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This template will be used as a starting point for AI-generated responses
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="utc">
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
              <Label htmlFor="language">Default Language</Label>
              <Select defaultValue="en">
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="ar">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      العربية (Arabic)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Sync Scheduling */}
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
                  <div className="flex items-center justify-between w-full">
                    <span>Manual Only</span>
                    <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Daily (Midnight UTC)</SelectItem>
                <SelectItem value="twice-daily">Twice Daily (9 AM & 6 PM UTC)</SelectItem>
                <SelectItem value="weekly">Weekly (Mondays)</SelectItem>
              </SelectContent>
            </Select>

            {/* Sync Description */}
            <div className="p-3 bg-secondary/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {syncSchedule === 'manual' && '✓ You control when to sync. Click "Sync Now" button on the dashboard.'}
                {syncSchedule === 'hourly' && '⚡ Your data syncs automatically every hour. Good for high-traffic businesses.'}
                {syncSchedule === 'daily' && '📅 Your data syncs once per day at midnight UTC. Balanced approach.'}
                {syncSchedule === 'twice-daily' && '🕐 Your data syncs twice daily at 9 AM and 6 PM UTC. Good for active businesses.'}
                {syncSchedule === 'weekly' && '📆 Your data syncs every Monday at midnight UTC. Light usage.'}
              </p>
            </div>
          </div>

          {syncSchedule !== 'manual' && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-foreground">Auto-sync enabled</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your Google My Business data will be synchronized automatically. You can still manually sync anytime from the dashboard.
              </p>
            </div>
          )}

          {/* Last Sync Status */}
          {activeAccounts.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-primary/20">
              <Label className="text-sm font-medium">Recent Sync Activity</Label>
              <div className="space-y-2">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between text-sm p-2 bg-secondary/30 rounded">
                    <span className="text-muted-foreground">
                      {account.account_name || 'GMB Account'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {account.last_sync 
                        ? new Date(account.last_sync).toLocaleString() 
                        : 'Never synced'}
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
          <CardTitle>Publishing & Automation</CardTitle>
          <CardDescription>
            Control how content is published to your GMB profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-publish">Auto-publish Updates</Label>
              <p className="text-sm text-muted-foreground">
                Automatically publish approved content to Google My Business
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
                ⚠️ Content will be published automatically after AI generation. Make sure to review AI settings carefully.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
