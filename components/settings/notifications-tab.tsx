"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Bell, Mail, MessageSquare, Smartphone, Clock } from "lucide-react"

interface NotificationsTabProps {
  reviewNotifications: boolean
  setReviewNotifications: (value: boolean) => void
  emailDigest: string
  setEmailDigest: (value: string) => void
  emailDeliveryTime: string
  setEmailDeliveryTime: (value: string) => void
  negativePriority: boolean
  setNegativePriority: (value: boolean) => void
  replyReminders: boolean
  setReplyReminders: (value: boolean) => void
  browserNotifications: boolean
  setBrowserNotifications: (value: boolean) => void
  soundAlerts: boolean
  setSoundAlerts: (value: boolean) => void
  quietHours: boolean
  setQuietHours: (value: boolean) => void
  quietHoursStart: string
  setQuietHoursStart: (value: string) => void
  quietHoursEnd: string
  setQuietHoursEnd: (value: string) => void
  notifyReviews: boolean
  setNotifyReviews: (value: boolean) => void
  notifyQuestions: boolean
  setNotifyQuestions: (value: boolean) => void
  notifyMessages: boolean
  setNotifyMessages: (value: boolean) => void
  notifyMentions: boolean
  setNotifyMentions: (value: boolean) => void
  notifyInsights: boolean
  setNotifyInsights: (value: boolean) => void
  notifyTips: boolean
  setNotifyTips: (value: boolean) => void
}

export function NotificationsTab({
  reviewNotifications,
  setReviewNotifications,
  emailDigest,
  setEmailDigest,
  emailDeliveryTime,
  setEmailDeliveryTime,
  negativePriority,
  setNegativePriority,
  replyReminders,
  setReplyReminders,
  browserNotifications,
  setBrowserNotifications,
  soundAlerts,
  setSoundAlerts,
  quietHours,
  setQuietHours,
  quietHoursStart,
  setQuietHoursStart,
  quietHoursEnd,
  setQuietHoursEnd,
  notifyReviews,
  setNotifyReviews,
  notifyQuestions,
  setNotifyQuestions,
  notifyMessages,
  setNotifyMessages,
  notifyMentions,
  setNotifyMentions,
  notifyInsights,
  setNotifyInsights,
  notifyTips,
  setNotifyTips
}: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Review Notifications */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Review Notifications
          </CardTitle>
          <CardDescription>
            Get notified when you receive new reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="review-notifications" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                New Review Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Instant notification when a customer leaves a review
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
              <Label htmlFor="negative-priority">Priority Alerts for Negative Reviews</Label>
              <p className="text-sm text-muted-foreground">
                High-priority notifications for reviews with 3 stars or less
              </p>
            </div>
            <Switch 
              id="negative-priority" 
              checked={negativePriority}
              onCheckedChange={setNegativePriority}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reply-reminders">Reply Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Remind me to reply to reviews after 24 hours
              </p>
            </div>
            <Switch 
              id="reply-reminders" 
              checked={replyReminders}
              onCheckedChange={setReplyReminders}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Digest
          </CardTitle>
          <CardDescription>
            Receive summary emails of your GMB activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-digest">Digest Frequency</Label>
            <Select value={emailDigest} onValueChange={setEmailDigest}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Real-time (Instant emails)</span>
                  </div>
                </SelectItem>
                <SelectItem value="daily">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Daily Summary</span>
                    <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Weekly Summary</span>
                  </div>
                </SelectItem>
                <SelectItem value="monthly">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Monthly Summary</span>
                  </div>
                </SelectItem>
                <SelectItem value="never">
                  <div className="flex items-center gap-2">
                    <span>Never (Disable emails)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="p-3 bg-secondary/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {emailDigest === 'realtime' && '📧 You\'ll receive an email immediately for each new activity'}
                {emailDigest === 'daily' && '📅 You\'ll receive one email per day with a summary of all activity'}
                {emailDigest === 'weekly' && '📆 You\'ll receive one email per week with a summary of all activity'}
                {emailDigest === 'monthly' && '📊 You\'ll receive one email per month with a comprehensive report'}
                {emailDigest === 'never' && '🔕 Email notifications are disabled. You can still see activity in the dashboard.'}
              </p>
            </div>
          </div>

          {emailDigest !== 'never' && emailDigest !== 'realtime' && (
            <div className="space-y-2">
              <Label>Email Delivery Time</Label>
              <Select value={emailDeliveryTime} onValueChange={setEmailDeliveryTime}>
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM (Recommended)</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="21:00">9:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Browser notifications for real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications">Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in your browser
              </p>
            </div>
            <Switch 
              id="browser-notifications" 
              checked={browserNotifications}
              onCheckedChange={setBrowserNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-alerts">Sound Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Play a sound with notifications
              </p>
            </div>
            <Switch 
              id="sound-alerts" 
              checked={soundAlerts}
              onCheckedChange={setSoundAlerts}
            />
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 Enable browser notifications to get instant alerts even when the app is in the background
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle>What to Notify About</CardTitle>
          <CardDescription>
            Choose which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-reviews">New Reviews</Label>
            <Switch 
              id="notify-reviews" 
              checked={notifyReviews}
              onCheckedChange={setNotifyReviews}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-questions">New Questions</Label>
            <Switch 
              id="notify-questions" 
              checked={notifyQuestions}
              onCheckedChange={setNotifyQuestions}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-messages">Direct Messages</Label>
            <Switch 
              id="notify-messages" 
              checked={notifyMessages}
              onCheckedChange={setNotifyMessages}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-mentions">Profile Updates</Label>
            <Switch 
              id="notify-mentions" 
              checked={notifyMentions}
              onCheckedChange={setNotifyMentions}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-insights">Weekly Insights Report</Label>
            <Switch 
              id="notify-insights" 
              checked={notifyInsights}
              onCheckedChange={setNotifyInsights}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-tips">Tips & Recommendations</Label>
            <Switch 
              id="notify-tips" 
              checked={notifyTips}
              onCheckedChange={setNotifyTips}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                No notifications during your rest time
              </p>
            </div>
            <Switch 
              id="quiet-hours" 
              checked={quietHours}
              onCheckedChange={setQuietHours}
            />
          </div>

          {quietHours && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Select value={quietHoursStart} onValueChange={setQuietHoursStart}>
                  <SelectTrigger className="bg-secondary border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                    <SelectItem value="23:00">11:00 PM</SelectItem>
                    <SelectItem value="00:00">12:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Select value={quietHoursEnd} onValueChange={setQuietHoursEnd}>
                  <SelectTrigger className="bg-secondary border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
