"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Globe, Moon, Bell, Download, Trash2 } from "lucide-react"
import { useTranslations } from 'next-intl'
import { toast } from "sonner"
import { useState } from "react"

interface AppSettingsTabProps {
  language: string
  setLanguage: (value: string) => void
  theme?: string
  setTheme?: (value: string) => void
  notifications?: boolean
  setNotifications?: (value: boolean) => void
  emailUpdates?: boolean
  setEmailUpdates?: (value: boolean) => void
}

export function AppSettingsTab({
  language,
  setLanguage,
  theme = 'system',
  setTheme = () => {},
  notifications = true,
  setNotifications = () => {},
  emailUpdates = false,
  setEmailUpdates = () => {}
}: AppSettingsTabProps) {
  const t = useTranslations('Settings')
  const [isClearing, setIsClearing] = useState(false)

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Clear app cache
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      toast.success('Cache cleared successfully')
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      toast.error('Failed to clear cache')
      setIsClearing(false)
    }
  }

  const handleExportData = () => {
    toast.info('Preparing your data export...')
    // This would trigger the actual export process
    window.location.href = '/api/user/export-data'
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            General
          </CardTitle>
          <CardDescription>
            Language and appearance settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  <span className="flex items-center gap-2">
                    🇬🇧 English
                  </span>
                </SelectItem>
                <SelectItem value="ar">
                  <span className="flex items-center gap-2">
                    🇸🇦 العربية
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Theme
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">🌞 Light</SelectItem>
                <SelectItem value="dark">🌙 Dark</SelectItem>
                <SelectItem value="system">🔄 System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Manage how you receive updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications">Browser Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Get notified about new reviews and updates
              </p>
            </div>
            <Switch
              id="browser-notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          {/* Email Updates */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-updates">Email Updates</Label>
              <p className="text-xs text-muted-foreground">
                Receive weekly summary emails
              </p>
            </div>
            <Switch
              id="email-updates"
              checked={emailUpdates}
              onCheckedChange={setEmailUpdates}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export your data or clear cache
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">
                Download all your data as CSV
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Clear Cache */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Clear Cache</p>
              <p className="text-xs text-muted-foreground">
                Clear browser cache and reload
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearCache}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? 'Clearing...' : 'Clear'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
