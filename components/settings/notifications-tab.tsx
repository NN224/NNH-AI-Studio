"use client";

import { t } from "@/lib/i18n/stub";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Smartphone, Clock } from "lucide-react";
// Temporarily disabled due to build issues
// import GMBNotificationsSetup from './gmb-notifications-setup'
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NotificationsTabProps {
  reviewNotifications: boolean;
  setReviewNotifications: (value: boolean) => void;
  emailDigest: string;
  setEmailDigest: (value: string) => void;
  emailDeliveryTime: string;
  setEmailDeliveryTime: (value: string) => void;
  negativePriority: boolean;
  setNegativePriority: (value: boolean) => void;
  replyReminders: boolean;
  setReplyReminders: (value: boolean) => void;
  browserNotifications: boolean;
  setBrowserNotifications: (value: boolean) => void;
  soundAlerts: boolean;
  setSoundAlerts: (value: boolean) => void;
  quietHours: boolean;
  setQuietHours: (value: boolean) => void;
  quietHoursStart: string;
  setQuietHoursStart: (value: string) => void;
  quietHoursEnd: string;
  setQuietHoursEnd: (value: string) => void;
  notifyReviews: boolean;
  setNotifyReviews: (value: boolean) => void;
  notifyQuestions: boolean;
  setNotifyQuestions: (value: boolean) => void;
  notifyMessages: boolean;
  setNotifyMessages: (value: boolean) => void;
  notifyMentions: boolean;
  setNotifyMentions: (value: boolean) => void;
  notifyInsights: boolean;
  setNotifyInsights: (value: boolean) => void;
  notifyTips: boolean;
  setNotifyTips: (value: boolean) => void;
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
  setNotifyTips,
}: NotificationsTabProps) {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }
  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGMBAccount() {
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      if (!user) return;

      const { data: accounts } = await supabase!
        .from("gmb_accounts")
        .select("account_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (accounts?.account_id) {
        setGmbAccountId(accounts.account_id);
      }
    }

    loadGMBAccount();
  }, [supabase]);

  return (
    <div className="space-y-6">
      {/* Review Notifications */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t("reviewNotifications.title")}
          </CardTitle>
          <CardDescription>
            {t("reviewNotifications.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="review-notifications"
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                {t("reviewNotifications.newAlerts")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("reviewNotifications.newAlertsDesc")}
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
              <Label htmlFor="negative-priority">{t("negativePriority")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("reviewNotifications.negativePriorityDesc")}
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
              <Label htmlFor="reply-reminders">{t("replyReminders")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("reviewNotifications.replyRemindersDesc")}
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
            {t("emailDigest.title")}
          </CardTitle>
          <CardDescription>{t("emailDigest.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-digest">{t("emailDigest.frequency")}</Label>
            <Select value={emailDigest} onValueChange={setEmailDigest}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue placeholder={t("emailDigest.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span>{t("emailDigest.options.realtime")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="daily">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{t("emailDigest.options.daily")}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {t("emailDigest.recommended")}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{t("emailDigest.options.weekly")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="monthly">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{t("emailDigest.options.monthly")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="never">
                  <div className="flex items-center gap-2">
                    <span>{t("emailDigest.options.never")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="p-3 bg-secondary/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {emailDigest === "realtime" &&
                  t("emailDigest.descriptions.realtime")}
                {emailDigest === "daily" && t("emailDigest.descriptions.daily")}
                {emailDigest === "weekly" &&
                  t("emailDigest.descriptions.weekly")}
                {emailDigest === "monthly" &&
                  t("emailDigest.descriptions.monthly")}
                {emailDigest === "never" && t("emailDigest.descriptions.never")}
              </p>
            </div>
          </div>

          {emailDigest !== "never" && emailDigest !== "realtime" && (
            <div className="space-y-2">
              <Label>{t("emailDeliveryTime")}</Label>
              <Select
                value={emailDeliveryTime}
                onValueChange={setEmailDeliveryTime}
              >
                <SelectTrigger className="bg-secondary border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="09:00">
                    9:00 AM ({t("emailDigest.recommended")})
                  </SelectItem>
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
            {t("pushNotifications.title")}
          </CardTitle>
          <CardDescription>
            {t("pushNotifications.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications">
                {t("browserNotifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("pushNotifications.browserDesc")}
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
              <Label htmlFor="sound-alerts">{t("soundAlerts")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("pushNotifications.soundDesc")}
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
              {t("pushNotifications.hint")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle>{t("preferences.title")}</CardTitle>
          <CardDescription>{t("preferences.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-reviews">{t("notifyReviews")}</Label>
            <Switch
              id="notify-reviews"
              checked={notifyReviews}
              onCheckedChange={setNotifyReviews}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-questions">{t("notifyQuestions")}</Label>
            <Switch
              id="notify-questions"
              checked={notifyQuestions}
              onCheckedChange={setNotifyQuestions}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-messages">{t("notifyMessages")}</Label>
            <Switch
              id="notify-messages"
              checked={notifyMessages}
              onCheckedChange={setNotifyMessages}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-mentions">{t("notifyMentions")}</Label>
            <Switch
              id="notify-mentions"
              checked={notifyMentions}
              onCheckedChange={setNotifyMentions}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-insights">{t("notifyInsights")}</Label>
            <Switch
              id="notify-insights"
              checked={notifyInsights}
              onCheckedChange={setNotifyInsights}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-tips">{t("notifyTips")}</Label>
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
            {t("quietHours.title")}
          </CardTitle>
          <CardDescription>{t("quietHours.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-hours">{t("quietHours.enable")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("quietHours.enableDesc")}
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
                <Label htmlFor="quiet-start">{t("quietHoursStart")}</Label>
                <Select
                  value={quietHoursStart}
                  onValueChange={setQuietHoursStart}
                >
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
                <Label htmlFor="quiet-end">{t("quietHoursEnd")}</Label>
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

      {/* GMB Real-time Notifications */}
      {/* Temporarily disabled due to build issues */}
      {/* {gmbAccountId && (
        <GMBNotificationsSetup accountId={gmbAccountId} />
      )} */}
    </div>
  );
}
