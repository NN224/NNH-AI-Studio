# ⚠️ مشكلة خطيرة: استخدام خاطئ لـ Notifications API

## المشكلة المكتشفة

**أنتم تستخدمون نظام notifications محلي (داخلي) بدلاً من Google Business Notifications API الرسمي!**

---

## الفرق بين النظامين

### ❌ **ما تستخدمونه حالياً (خطأ)**

#### 1. نظام Notifications محلي
```typescript
// app/api/notifications/route.ts
export async function GET(request: NextRequest) {
  const { data } = await supabase
    .from('notifications')  // ❌ جدول محلي في Supabase
    .select('*')
    .eq('user_id', user.id)
}
```

**المشاكل**:
- ❌ لا يتلقى إشعارات من Google مباشرة
- ❌ يعتمد على polling يدوي (تحديث كل فترة)
- ❌ لا يستخدم Google Pub/Sub
- ❌ لا يستخدم `mybusinessnotifications` API
- ❌ بطيء ومكلف (استعلامات متكررة)
- ❌ قد يفوّت إشعارات مهمة

---

### ✅ **ما يجب استخدامه (صحيح)**

#### Google Business Notifications API
```typescript
// الطريقة الصحيحة
GET https://mybusinessnotifications.googleapis.com/v1/accounts/{account_id}/notificationSetting
PATCH https://mybusinessnotifications.googleapis.com/v1/accounts/{account_id}/notificationSetting
```

**الفوائد**:
- ✅ إشعارات فورية من Google (Real-time)
- ✅ يستخدم Google Pub/Sub (Push notifications)
- ✅ لا حاجة لـ polling
- ✅ موثوق 100%
- ✅ يدعم جميع أنواع الإشعارات

---

## كيف يعمل النظام الصحيح؟

### 1. **إعداد Pub/Sub Topic**

#### الخطوة الأولى: إنشاء Topic في Google Cloud
```bash
# في Google Cloud Console
1. انتقل إلى Pub/Sub
2. أنشئ Topic جديد: "gmb-notifications"
3. أعط الصلاحيات للحساب:
   mybusiness-api-pubsub@system.gserviceaccount.com
   الصلاحية: Pub/Sub Publisher
```

#### الخطوة الثانية: تسجيل الـ Topic مع Google
```typescript
// تسجيل الـ Pub/Sub topic
PATCH https://mybusinessnotifications.googleapis.com/v1/accounts/{account_id}/notificationSetting

Body:
{
  "name": "accounts/{account_id}/notificationSetting",
  "pubsubTopic": "projects/{project_id}/topics/gmb-notifications",
  "notificationTypes": [
    "NEW_REVIEW",
    "UPDATED_REVIEW",
    "NEW_QUESTION",
    "UPDATED_QUESTION",
    "NEW_ANSWER",
    "UPDATED_ANSWER",
    "NEW_CUSTOMER_MEDIA",
    "GOOGLE_UPDATE",
    "DUPLICATE_LOCATION",
    "VOICE_OF_MERCHANT_UPDATED"
  ]
}
```

---

### 2. **أنواع الإشعارات المتاحة**

```typescript
enum NotificationType {
  // ✅ مراجعات جديدة
  NEW_REVIEW = "NEW_REVIEW",
  
  // ✅ تحديثات على المراجعات
  UPDATED_REVIEW = "UPDATED_REVIEW",
  
  // ✅ أسئلة جديدة
  NEW_QUESTION = "NEW_QUESTION",
  
  // ✅ تحديثات على الأسئلة
  UPDATED_QUESTION = "UPDATED_QUESTION",
  
  // ✅ إجابات جديدة
  NEW_ANSWER = "NEW_ANSWER",
  
  // ✅ تحديثات على الإجابات
  UPDATED_ANSWER = "UPDATED_ANSWER",
  
  // ✅ صور/فيديوهات من العملاء
  NEW_CUSTOMER_MEDIA = "NEW_CUSTOMER_MEDIA",
  
  // ✅ تحديثات من Google
  GOOGLE_UPDATE = "GOOGLE_UPDATE",
  
  // ✅ موقع مكرر
  DUPLICATE_LOCATION = "DUPLICATE_LOCATION",
  
  // ✅ تغيير في حالة Voice of Merchant
  VOICE_OF_MERCHANT_UPDATED = "VOICE_OF_MERCHANT_UPDATED"
}
```

---

### 3. **استقبال الإشعارات**

#### إنشاء Webhook Endpoint
```typescript
// app/api/webhooks/gmb-notifications/route.ts

export async function POST(request: NextRequest) {
  try {
    // 1. التحقق من Pub/Sub signature
    const signature = request.headers.get('x-goog-signature')
    const body = await request.text()
    
    if (!verifyPubSubSignature(signature, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. فك تشفير الرسالة
    const message = JSON.parse(body)
    const data = JSON.parse(
      Buffer.from(message.message.data, 'base64').toString()
    )

    // 3. معالجة الإشعار حسب النوع
    switch (data.notificationType) {
      case 'NEW_REVIEW':
        await handleNewReview(data)
        break
      
      case 'NEW_QUESTION':
        await handleNewQuestion(data)
        break
      
      case 'NEW_CUSTOMER_MEDIA':
        await handleNewMedia(data)
        break
      
      // ... باقي الأنواع
    }

    // 4. حفظ في قاعدة البيانات المحلية
    await supabase.from('notifications').insert({
      user_id: data.userId,
      type: data.notificationType,
      location_id: data.locationName,
      review_id: data.reviewName,
      question_id: data.questionName,
      data: data,
      read: false,
      created_at: new Date()
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function handleNewReview(data: any) {
  // جلب تفاصيل المراجعة
  const reviewId = data.reviewName
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )
  
  const review = await response.json()
  
  // حفظ في قاعدة البيانات
  await supabase.from('reviews').upsert({
    external_review_id: review.reviewId,
    rating: review.starRating,
    comment: review.comment,
    // ... باقي الحقول
  })
  
  // إرسال إشعار للمستخدم
  await sendUserNotification({
    type: 'new_review',
    title: 'مراجعة جديدة',
    message: `تقييم ${review.starRating} نجوم`,
    data: review
  })
}
```

---

## الكود الصحيح للتكامل

### 1. إنشاء API Route لإعداد الإشعارات

```typescript
// app/api/gmb/notifications/setup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/gmb/helpers'

const NOTIFICATIONS_API_BASE = 'https://mybusinessnotifications.googleapis.com/v1'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GMB account
    const { data: account } = await supabase
      .from('gmb_accounts')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'No GMB account' }, { status: 404 })
    }

    const accessToken = await getValidAccessToken(supabase, account.id)
    
    // Get current notification settings
    const url = `${NOTIFICATIONS_API_BASE}/accounts/${account.account_id}/notificationSetting`
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error }, { status: response.status })
    }

    const settings = await response.json()
    return NextResponse.json({ data: settings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pubsubTopic, notificationTypes } = body

    // Get GMB account
    const { data: account } = await supabase
      .from('gmb_accounts')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'No GMB account' }, { status: 404 })
    }

    const accessToken = await getValidAccessToken(supabase, account.id)
    
    // Update notification settings
    const url = `${NOTIFICATIONS_API_BASE}/accounts/${account.account_id}/notificationSetting`
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `accounts/${account.account_id}/notificationSetting`,
        pubsubTopic,
        notificationTypes
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error }, { status: response.status })
    }

    const settings = await response.json()
    return NextResponse.json({ data: settings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

### 2. Component لإعداد الإشعارات

```typescript
// components/settings/gmb-notifications-setup.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Check, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const NOTIFICATION_TYPES = [
  { value: 'NEW_REVIEW', label: 'مراجعات جديدة' },
  { value: 'UPDATED_REVIEW', label: 'تحديثات المراجعات' },
  { value: 'NEW_QUESTION', label: 'أسئلة جديدة' },
  { value: 'UPDATED_QUESTION', label: 'تحديثات الأسئلة' },
  { value: 'NEW_ANSWER', label: 'إجابات جديدة' },
  { value: 'UPDATED_ANSWER', label: 'تحديثات الإجابات' },
  { value: 'NEW_CUSTOMER_MEDIA', label: 'صور/فيديوهات من العملاء' },
  { value: 'GOOGLE_UPDATE', label: 'تحديثات من Google' },
  { value: 'DUPLICATE_LOCATION', label: 'مواقع مكررة' },
  { value: 'VOICE_OF_MERCHANT_UPDATED', label: 'تحديثات Voice of Merchant' }
]

export function GmbNotificationsSetup() {
  const [loading, setLoading] = useState(false)
  const [pubsubTopic, setPubsubTopic] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [currentSettings, setCurrentSettings] = useState<any>(null)

  useEffect(() => {
    fetchCurrentSettings()
  }, [])

  async function fetchCurrentSettings() {
    try {
      const response = await fetch('/api/gmb/notifications/setup')
      const data = await response.json()
      
      if (data.data) {
        setPubsubTopic(data.data.pubsubTopic || '')
        setSelectedTypes(data.data.notificationTypes || [])
        setCurrentSettings(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const response = await fetch('/api/gmb/notifications/setup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubsubTopic,
          notificationTypes: selectedTypes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث إعدادات الإشعارات بنجاح',
        variant: 'default'
      })

      await fetchCurrentSettings()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الإعدادات',
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          إعدادات إشعارات Google Business
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pub/Sub Topic */}
        <div className="space-y-2">
          <Label htmlFor="pubsub-topic">
            Google Pub/Sub Topic
          </Label>
          <Input
            id="pubsub-topic"
            placeholder="projects/your-project/topics/gmb-notifications"
            value={pubsubTopic}
            onChange={(e) => setPubsubTopic(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            مثال: projects/my-project-123/topics/gmb-notifications
          </p>
        </div>

        {/* Notification Types */}
        <div className="space-y-3">
          <Label>أنواع الإشعارات</Label>
          <div className="space-y-2">
            {NOTIFICATION_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => toggleType(type.value)}
                />
                <Label
                  htmlFor={type.value}
                  className="cursor-pointer font-normal"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Current Status */}
        {currentSettings && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              {currentSettings.pubsubTopic ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">الإشعارات مفعّلة</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-sm">الإشعارات غير مفعّلة</span>
                </>
              )}
            </div>
            {currentSettings.pubsubTopic && (
              <p className="text-xs text-muted-foreground">
                Topic: {currentSettings.pubsubTopic}
              </p>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={loading || !pubsubTopic || selectedTypes.length === 0}
          className="w-full"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>

        {/* Instructions */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>ملاحظة:</strong> يجب إعطاء الصلاحيات للحساب:
            <br />
            <code className="text-xs">mybusiness-api-pubsub@system.gserviceaccount.com</code>
            <br />
            الصلاحية: <strong>Pub/Sub Publisher</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## الخطوات المطلوبة للإصلاح

### 1. ✅ **إعداد Google Cloud Pub/Sub**

```bash
# في Google Cloud Console
1. انتقل إلى Pub/Sub
2. أنشئ Topic: "gmb-notifications"
3. أنشئ Subscription: "gmb-notifications-sub"
4. أعط الصلاحيات:
   - mybusiness-api-pubsub@system.gserviceaccount.com → Pub/Sub Publisher
   - your-service-account@... → Pub/Sub Subscriber
```

---

### 2. ✅ **إنشاء Webhook Endpoint**

```typescript
// app/api/webhooks/gmb-notifications/route.ts
// (الكود موجود أعلاه)
```

---

### 3. ✅ **تسجيل الـ Webhook في Google Cloud**

```bash
# في Google Cloud Console → Pub/Sub → Subscriptions
1. اختر subscription: "gmb-notifications-sub"
2. Edit → Push delivery
3. Endpoint URL: https://your-domain.com/api/webhooks/gmb-notifications
4. حفظ
```

---

### 4. ✅ **تحديث إعدادات الإشعارات**

استخدم الـ Component الجديد:
```typescript
// في components/settings/gmb-settings.tsx
import { GmbNotificationsSetup } from './gmb-notifications-setup'

// أضف tab جديد
<TabsContent value="notifications">
  <GmbNotificationsSetup />
</TabsContent>
```

---

### 5. ✅ **تحديث جدول Notifications**

```sql
-- إضافة حقول جديدة
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS review_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS question_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS answer_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS media_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS raw_data JSONB;
```

---

## المقارنة: قبل وبعد

### ❌ **قبل (النظام الحالي)**

```typescript
// Polling كل 30 ثانية
setInterval(async () => {
  const response = await fetch('/api/notifications')
  const data = await response.json()
  // ...
}, 30000)
```

**المشاكل**:
- 🔴 بطيء (تأخير حتى 30 ثانية)
- 🔴 مكلف (استعلامات متكررة)
- 🔴 غير موثوق (قد يفوّت إشعارات)
- 🔴 لا يعمل في real-time

---

### ✅ **بعد (النظام الصحيح)**

```typescript
// Google يرسل إشعار فوري عبر Pub/Sub
// Webhook يستقبل ويعالج تلقائياً
// المستخدم يتلقى إشعار فوري
```

**الفوائد**:
- 🟢 فوري (أقل من ثانية)
- 🟢 موثوق 100%
- 🟢 مجاني (لا استعلامات متكررة)
- 🟢 Real-time حقيقي

---

## الخلاصة

### المشكلة الحالية
❌ **تستخدمون نظام notifications محلي بدلاً من Google Business Notifications API**

### الحل المطلوب
✅ **التكامل مع Google Business Notifications API + Pub/Sub**

### الخطوات
1. ✅ إعداد Google Cloud Pub/Sub
2. ✅ إنشاء Webhook endpoint
3. ✅ تسجيل الـ Topic مع Google
4. ✅ معالجة الإشعارات الواردة
5. ✅ تحديث UI

### الفوائد
- ⚡ إشعارات فورية (real-time)
- 💰 توفير التكاليف (لا polling)
- 🎯 موثوقية عالية
- 📊 دعم جميع أنواع الإشعارات

---

## ملاحظات مهمة

### 1. **الـ Scope المطلوب**
```
https://www.googleapis.com/auth/business.manage
```
موجود بالفعل ✅

### 2. **التكلفة**
- Google Pub/Sub: مجاني حتى 10 GB/شهر
- بعد ذلك: $0.40 لكل مليون رسالة

### 3. **الأمان**
- يجب التحقق من Pub/Sub signature
- استخدام HTTPS فقط
- تشفير البيانات الحساسة

---

## التاريخ
- **تاريخ الاكتشاف**: 2024-11-16
- **الحالة**: ⚠️ مشكلة خطيرة - يجب الإصلاح
- **الأولوية**: 🔴 عالية جداً

