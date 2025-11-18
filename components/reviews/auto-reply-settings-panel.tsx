'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Star,
  Settings,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import type { AutoReplySettings } from '@/server/actions/auto-reply';
import { ActivityStatsCard } from '@/components/settings/activity-stats-card';
import { TestAutoReplySection } from '@/components/settings/test-auto-reply-section';

interface AutoReplySettingsPanelProps {
  locationId?: string;
}

export function AutoReplySettingsPanel({ locationId }: AutoReplySettingsPanelProps) {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [locationId]);

  async function loadSettings() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (locationId) {
        params.set('locationId', locationId);
      }
      const response = await fetch(`/api/reviews/auto-reply?${params.toString()}`);
      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    try {
      setSaving(true);
      
      const { saveAutoReplySettings } = await import('@/server/actions/auto-reply');
      const result = await saveAutoReplySettings(settings);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      toast.success('✅ تم الحفظ بنجاح');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  function updateSetting<K extends keyof AutoReplySettings>(
    key: K,
    value: AutoReplySettings[K]
  ) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Bot className="w-8 h-8 text-orange-500 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-zinc-400">فشل تحميل الإعدادات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-400" />
              إعدادات الرد التلقائي
            </CardTitle>
            <CardDescription>
              إدارة إعدادات AI Auto-Reply للمراجعات
            </CardDescription>
          </div>
          <Badge 
            variant={settings.enabled ? "default" : "outline"}
            className={settings.enabled ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
          >
            {settings.enabled ? "🟢 مُفعّل" : "⚪ معطّل"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            <TabsTrigger value="test">اختبار</TabsTrigger>
            <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
              <div>
                <Label className="text-white text-base">تفعيل الطيار الآلي</Label>
                <p className="text-sm text-zinc-400 mt-1">
                  سيرد الـ AI تلقائياً على جميع المراجعات الجديدة
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>

            {!settings.requireApproval && settings.enabled && (
              <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-300 font-medium">الوضع الفوري مُفعّل!</p>
                    <p className="text-green-400/80 text-sm mt-1">
                      سيتم الرد على المراجعات خلال أقل من دقيقة
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Per-Rating Controls */}
            {settings.enabled && (
              <div className="space-y-3">
                <Label className="text-white text-base">التحكم بالرد حسب التقييم</Label>
                {[
                  { key: 'autoReply5Star' as const, label: '⭐⭐⭐⭐⭐ 5 نجوم', color: 'text-green-400' },
                  { key: 'autoReply4Star' as const, label: '⭐⭐⭐⭐ 4 نجوم', color: 'text-green-300' },
                  { key: 'autoReply3Star' as const, label: '⭐⭐⭐ 3 نجوم', color: 'text-yellow-400' },
                  { key: 'autoReply2Star' as const, label: '⭐⭐ 2 نجوم', color: 'text-orange-400' },
                  { key: 'autoReply1Star' as const, label: '⭐ 1 نجمة', color: 'text-red-400' },
                ].map((rating) => (
                  <div 
                    key={rating.key}
                    className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800"
                  >
                    <Label className={`text-base ${rating.color}`}>{rating.label}</Label>
                    <Switch
                      checked={settings[rating.key] ?? true}
                      onCheckedChange={(checked) => updateSetting(rating.key, checked)}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tone Selection */}
            {settings.enabled && (
              <div className="space-y-3">
                <Label className="text-white text-base">نبرة الردود</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'friendly', label: '😊 ودود', desc: 'دافئ ومرحب' },
                    { value: 'professional', label: '💼 احترافي', desc: 'رسمي ومهني' },
                    { value: 'apologetic', label: '🙏 اعتذاري', desc: 'للردود السلبية' },
                    { value: 'marketing', label: '🎯 تسويقي', desc: 'ترويجي ومشجع' },
                  ].map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => updateSetting('tone', tone.value as any)}
                      className={`p-4 rounded-lg border-2 text-right transition-all ${
                        settings.tone === tone.value
                          ? 'border-orange-500 bg-orange-950/30'
                          : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-medium text-white">{tone.label}</div>
                      <div className="text-sm text-zinc-400 mt-1">{tone.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
            </Button>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <TestAutoReplySection />
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            {settings.enabled ? (
              <ActivityStatsCard />
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <p>فعّل Auto-Reply لعرض الإحصائيات</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

