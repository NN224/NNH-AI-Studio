'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Star
} from 'lucide-react'
import { toast } from 'sonner'
import type { AutoReplySettings } from '@/server/actions/auto-reply'
import { ActivityStatsCard } from '@/components/settings/activity-stats-card'

export default function AutoPilotPage() {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const response = await fetch('/api/reviews/auto-reply')
      const data = await response.json()
      
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('فشل تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!settings) return

    try {
      setSaving(true)
      
      // Use saveAutoReplySettings directly to save all settings including per-rating
      const { saveAutoReplySettings } = await import('@/server/actions/auto-reply')
      const result = await saveAutoReplySettings(settings)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save')
      }

      toast.success('✅ تم الحفظ بنجاح')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  function updateSetting<K extends keyof AutoReplySettings>(
    key: K,
    value: AutoReplySettings[K]
  ) {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bot className="w-12 h-12 text-orange-500 animate-pulse mx-auto mb-4" />
          <p className="text-zinc-400">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-zinc-400">فشل تحميل الإعدادات</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-orange-500" />
            الطيار الآلي
          </h1>
          <p className="text-zinc-400 mt-2">
            ردود تلقائية فورية على المراجعات والأسئلة
          </p>
        </div>
        
        <Badge 
          variant={settings.enabled ? "default" : "outline"}
          className={settings.enabled ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
        >
          {settings.enabled ? "🟢 مُفعّل" : "⚪ معطّل"}
        </Badge>
      </div>

      {/* Main Toggle */}
      <Card className="bg-gradient-to-r from-orange-950/30 to-zinc-900 border-orange-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            الرد التلقائي على المراجعات
          </CardTitle>
          <CardDescription>
            {settings.requireApproval 
              ? "⚠️ يتطلب الموافقة قبل الإرسال" 
              : "✅ رد فوري (خلال دقيقة واحدة)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
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
        </CardContent>
      </Card>

      {/* Per-Rating Controls */}
      {settings.enabled && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              التحكم بالرد حسب التقييم
            </CardTitle>
            <CardDescription>
              اختر التقييمات التي تريد الرد عليها تلقائياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      )}

      {/* Tone Selection */}
      {settings.enabled && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">نبرة الردود</CardTitle>
            <CardDescription>
              اختر أسلوب الرد الذي يناسب علامتك التجارية
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Activity Stats */}
      {settings.enabled && <ActivityStatsCard />}

      {/* Save Button */}
      <div className="flex gap-3">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </Button>
        
        <Button
          onClick={loadSettings}
          variant="outline"
          className="border-zinc-700 text-white hover:bg-zinc-800"
        >
          إعادة تحميل
        </Button>
      </div>
    </div>
  )
}

