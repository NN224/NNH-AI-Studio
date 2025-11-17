'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, X, AlertCircle, Info, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const NOTIFICATION_TYPES = [
  { 
    value: 'NEW_REVIEW', 
    label: 'مراجعات جديدة',
    description: 'إشعار عند نشر مراجعة جديدة',
    priority: 'high'
  },
  { 
    value: 'UPDATED_REVIEW', 
    label: 'تحديثات المراجعات',
    description: 'إشعار عند تحديث مراجعة موجودة',
    priority: 'medium'
  },
  { 
    value: 'NEW_QUESTION', 
    label: 'أسئلة جديدة',
    description: 'إشعار عند طرح سؤال جديد',
    priority: 'high'
  },
  { 
    value: 'UPDATED_QUESTION', 
    label: 'تحديثات الأسئلة',
    description: 'إشعار عند تحديث سؤال',
    priority: 'low'
  },
  { 
    value: 'NEW_ANSWER', 
    label: 'إجابات جديدة',
    description: 'إشعار عند نشر إجابة جديدة',
    priority: 'medium'
  },
  { 
    value: 'UPDATED_ANSWER', 
    label: 'تحديثات الإجابات',
    description: 'إشعار عند تحديث إجابة',
    priority: 'low'
  },
  { 
    value: 'NEW_CUSTOMER_MEDIA', 
    label: 'صور/فيديوهات من العملاء',
    description: 'إشعار عند رفع صورة أو فيديو',
    priority: 'medium'
  },
  { 
    value: 'GOOGLE_UPDATE', 
    label: 'تحديثات من Google',
    description: 'إشعار عند تحديث Google للمعلومات',
    priority: 'high'
  },
  { 
    value: 'DUPLICATE_LOCATION', 
    label: 'مواقع مكررة',
    description: 'إشعار عند اكتشاف موقع مكرر',
    priority: 'high'
  },
  { 
    value: 'VOICE_OF_MERCHANT_UPDATED', 
    label: 'تحديثات Voice of Merchant',
    description: 'إشعار عند تغيير حالة الموقع',
    priority: 'high'
  }
]

interface NotificationSettings {
  name: string
  pubsubTopic: string
  notificationTypes: string[]
}

export function GmbNotificationsSetup() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [pubsubTopic, setPubsubTopic] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [currentSettings, setCurrentSettings] = useState<NotificationSettings | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCurrentSettings()
  }, [])

  useEffect(() => {
    // Check if there are changes
    if (currentSettings) {
      const topicChanged = pubsubTopic !== (currentSettings.pubsubTopic || '')
      const typesChanged = JSON.stringify(selectedTypes.sort()) !== 
                          JSON.stringify((currentSettings.notificationTypes || []).sort())
      setHasChanges(topicChanged || typesChanged)
    }
  }, [pubsubTopic, selectedTypes, currentSettings])

  async function fetchCurrentSettings() {
    setFetching(true)
    try {
      const response = await fetch('/api/gmb/notifications/setup')
      const result = await response.json()
      
      if (response.ok && result.data) {
        setPubsubTopic(result.data.pubsubTopic || '')
        setSelectedTypes(result.data.notificationTypes || [])
        setCurrentSettings(result.data)
      } else if (response.status === 404) {
        // No GMB account - show message
        toast({
          title: 'لا يوجد حساب GMB',
          description: 'يرجى ربط حساب Google Business أولاً',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الإعدادات',
        variant: 'destructive'
      })
    } finally {
      setFetching(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const response = await fetch('/api/gmb/notifications/setup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubsubTopic: pubsubTopic.trim(),
          notificationTypes: selectedTypes
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update settings')
      }

      toast({
        title: '✅ تم الحفظ',
        description: 'تم تحديث إعدادات الإشعارات بنجاح',
      })

      await fetchCurrentSettings()
      setHasChanges(false)
    } catch (error: any) {
      toast({
        title: '❌ خطأ',
        description: error.message || 'فشل تحديث الإعدادات',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function toggleType(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  function selectAll() {
    setSelectedTypes(NOTIFICATION_TYPES.map(t => t.value))
  }

  function deselectAll() {
    setSelectedTypes([])
  }

  function selectRecommended() {
    setSelectedTypes(
      NOTIFICATION_TYPES
        .filter(t => t.priority === 'high')
        .map(t => t.value)
    )
  }

  if (fetching) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isConfigured = currentSettings?.pubsubTopic && currentSettings.notificationTypes.length > 0

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={isConfigured ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            حالة إشعارات Google Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    الإشعارات مفعّلة ✓
                  </p>
                  <p className="text-sm text-muted-foreground">
                    تستقبل {currentSettings.notificationTypes.length} نوع من الإشعارات
                  </p>
                </div>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-600 dark:text-orange-400">
                    الإشعارات غير مفعّلة
                  </p>
                  <p className="text-sm text-muted-foreground">
                    قم بإعداد Pub/Sub Topic لتفعيل الإشعارات الفورية
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">خطوات الإعداد:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>انتقل إلى Google Cloud Console → Pub/Sub</li>
            <li>أنشئ Topic جديد (مثال: gmb-notifications)</li>
            <li>أعط الصلاحيات للحساب: <code className="text-xs bg-muted px-1 py-0.5 rounded">mybusiness-api-pubsub@system.gserviceaccount.com</code></li>
            <li>الصلاحية المطلوبة: <strong>Pub/Sub Publisher</strong></li>
            <li>انسخ Topic name والصقه أدناه</li>
          </ol>
          <a 
            href="https://console.cloud.google.com/cloudpubsub" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
          >
            فتح Google Cloud Console
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات Pub/Sub</CardTitle>
          <CardDescription>
            قم بتكوين Google Pub/Sub Topic لاستقبال الإشعارات الفورية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pub/Sub Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="pubsub-topic">
              Google Pub/Sub Topic *
            </Label>
            <Input
              id="pubsub-topic"
              placeholder="projects/your-project-id/topics/gmb-notifications"
              value={pubsubTopic}
              onChange={(e) => setPubsubTopic(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              مثال: projects/my-project-123/topics/gmb-notifications
            </p>
          </div>

          {/* Notification Types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>أنواع الإشعارات *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectRecommended}
                >
                  الموصى بها
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  تحديد الكل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                >
                  إلغاء الكل
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {NOTIFICATION_TYPES.map((type) => (
                <div 
                  key={type.value} 
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={type.value}
                    checked={selectedTypes.includes(type.value)}
                    onCheckedChange={() => toggleType(type.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={type.value}
                      className="cursor-pointer font-medium flex items-center gap-2"
                    >
                      {type.label}
                      {type.priority === 'high' && (
                        <Badge variant="default" className="text-xs">
                          موصى به
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              تم تحديد {selectedTypes.length} من {NOTIFICATION_TYPES.length} نوع
            </p>
          </div>

          {/* Current Settings Display */}
          {currentSettings?.pubsubTopic && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">الإعدادات الحالية:</p>
              <div className="space-y-1 text-xs">
                <p className="font-mono break-all">
                  <strong>Topic:</strong> {currentSettings.pubsubTopic}
                </p>
                <p>
                  <strong>الأنواع المفعّلة:</strong> {currentSettings.notificationTypes.length}
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={loading || !pubsubTopic.trim() || selectedTypes.length === 0 || !hasChanges}
              className="flex-1"
            >
              {loading ? 'جاري الحفظ...' : hasChanges ? 'حفظ التغييرات' : 'محفوظ ✓'}
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={fetchCurrentSettings}
                disabled={loading}
              >
                إلغاء
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>تحذير:</strong> تأكد من إعطاء الصلاحيات الصحيحة في Google Cloud Console،
          وإلا لن تعمل الإشعارات. يجب أن يكون للحساب{' '}
          <code className="text-xs bg-destructive/20 px-1 py-0.5 rounded">
            mybusiness-api-pubsub@system.gserviceaccount.com
          </code>{' '}
          صلاحية <strong>Pub/Sub Publisher</strong> على الـ Topic.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default GMBNotificationsSetup
