# دليل استخدام ميزات الذكاء الاصطناعي

## 🎯 الميزات الجديدة المضافة

تم دمج **3 ميزات AI** جديدة في Dashboard:

### 1. **AI Insights Panel** 🔮
**الموقع:** أسفل Dashboard  
**الوظيفة:** توقعات وتوصيات ذكية بناءً على بياناتك

**ما يعرضه:**
- 📊 توقعات الأسبوع القادم (reviews, rating)
- 🚨 اكتشاف الأنماط غير الطبيعية
- 💡 توصيات قابلة للتنفيذ
- 🎯 مقارنة مع المنافسين

---

### 2. **Automation Insights** ⚙️
**الموقع:** أسفل Dashboard  
**الوظيفة:** عرض حالة الأتمتة الذكية

**ما يعرضه:**
- ✅ عدد الأتمتة النشطة
- 📈 معدل النجاح
- ⏱️ الوقت الموفر
- 📅 الإجراءات القادمة

---

### 3. **Chat Assistant** 💬
**الموقع:** زر عائم في الأسفل يمين  
**الوظيفة:** مساعد محادثة ذكي

**ما يمكنك فعله:**
- ❓ اسأل أسئلة عن Dashboard
- 📊 "ما الذي يجب أن أركز عليه اليوم؟"
- 📉 "لماذا انخفض تقييمي؟"
- 📝 "أنشئ تقرير لمديري"

---

## 🚀 كيفية تفعيل AI Features

### الخطوة 1: إضافة API Key

1. **اذهب إلى Settings**
   ```
   /settings/ai
   ```

2. **اختر Provider**
   - OpenAI (GPT-4, GPT-3.5)
   - Anthropic (Claude 3)
   - Google AI (Gemini Pro)

3. **أدخل API Key**
   - احصل على المفتاح من:
     - OpenAI: https://platform.openai.com/api-keys
     - Anthropic: https://console.anthropic.com/settings/keys
     - Google: https://makersuite.google.com/app/apikey

4. **فعّل الإعدادات**
   - اضغط "تفعيل"
   - احفظ التغييرات

---

### الخطوة 2: تحديث Dashboard

1. **ارجع إلى Dashboard**
   ```
   /dashboard
   ```

2. **اضغط Refresh** (أو F5)

3. **Scroll للأسفل**
   - ستجد AI Insights Panel
   - ستجد Automation Insights
   - ستجد Chat Assistant (زر عائم)

---

## 🔍 استكشاف الأخطاء

### المشكلة: AI Components لا تظهر

**الحلول:**

#### 1. تحقق من API Key
```bash
# افتح /settings/ai
# تأكد من:
- ✅ API Key مُضاف
- ✅ Provider مُفعّل
- ✅ لا توجد أخطاء
```

#### 2. تحقق من Console
```bash
# في المتصفح:
- اضغط F12
- افتح Console
- ابحث عن أخطاء AI
```

#### 3. Hard Refresh
```bash
# في المتصفح:
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R
```

#### 4. Clear Cache
```bash
# في المتصفح:
- Settings > Privacy > Clear browsing data
- أو استخدم Incognito Mode
```

#### 5. Rebuild Project
```bash
cd /Users/nabel/Documents/GitHub/NNH-AI-Studio
npm run build
npm run dev
```

---

## 📍 مواقع AI Components في الكود

### Dashboard Page
```
app/[locale]/(dashboard)/dashboard/page.tsx
```

**السطور 420-436:**
```typescript
{/* Advanced AI Features - New Section */}
{gmbConnected && userId && (
  <>
    {/* AI Insights Panel */}
    <DashboardSection section="AI Insights Panel">
      <AIInsightsPanel userId={userId} />
    </DashboardSection>

    {/* Automation Insights */}
    <DashboardSection section="Automation Insights">
      <AutomationInsights userId={userId} />
    </DashboardSection>

    {/* Floating Chat Assistant */}
    <ChatAssistant userId={userId} />
  </>
)}
```

### AI Components
```
components/dashboard/ai/
├── ai-insights-panel.tsx      # AI Insights Panel
├── chat-assistant.tsx         # Chat Assistant
└── automation-insights.tsx    # Automation Insights
```

### API Routes
```
app/api/ai/
├── insights/route.ts          # AI Insights API
├── chat/route.ts              # Chat API
└── automation-status/route.ts # Automation Status API
```

### Settings Page
```
app/[locale]/(dashboard)/settings/ai/page.tsx
```

---

## 💰 التكلفة

### تتبع تلقائي
- كل طلب AI يُسجل في `ai_requests` table
- التكلفة تُحسب تلقائياً
- شاهد الإحصائيات في `/settings/ai`

### الأسعار التقريبية (لكل 1M token)

**OpenAI:**
- GPT-4: $30 input, $60 output
- GPT-3.5 Turbo: $0.50 input, $1.50 output

**Anthropic:**
- Claude 3 Sonnet: $3 input, $15 output
- Claude 3 Haiku: $0.25 input, $1.25 output

**Google:**
- Gemini Pro: $0.50 input, $1.50 output

**متوسط التكلفة لكل insight:** $0.01 - $0.05

---

## 🎨 Screenshots المتوقعة

### قبل إضافة API Key:
```
Dashboard → لا توجد AI Components
```

### بعد إضافة API Key:
```
Dashboard → Scroll للأسفل:

┌─────────────────────────────────┐
│  AI Insights Panel              │
│  ┌───────────────────────────┐  │
│  │ 📊 Next Week Predictions  │  │
│  │ 🚨 Anomaly Detection      │  │
│  │ 💡 Recommendations        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Automation Insights            │
│  ┌───────────────────────────┐  │
│  │ ✅ 5 Active Automations   │  │
│  │ 📈 95% Success Rate       │  │
│  │ ⏱️ 12h Saved This Week    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘

                    ┌──────────┐
                    │ 💬 Chat  │ ← Floating Button
                    └──────────┘
```

---

## 📝 ملاحظات مهمة

### 1. **Conditional Rendering**
AI Components تظهر فقط إذا:
- ✅ المستخدم مسجل دخول
- ✅ GMB متصل (`gmbConnected = true`)
- ✅ User ID موجود

### 2. **Lazy Loading**
AI Components يتم تحميلها dynamically:
- لا تؤثر على سرعة Dashboard
- تُحمّل فقط عند الحاجة

### 3. **Error Handling**
إذا فشل AI request:
- يظهر error message
- يمكنك إعادة المحاولة
- لا يؤثر على باقي Dashboard

---

## 🔐 الأمان

### API Keys
- ✅ مُشفرة في database
- ✅ لا تُرسل للـ client
- ✅ تُستخدم فقط في server-side

### Rate Limiting
- 100 requests/hour لكل user
- يمنع الاستخدام المفرط
- يحمي من التكاليف العالية

---

## 🆘 الدعم

إذا واجهت مشاكل:

1. **تحقق من Console Errors**
2. **تحقق من API Key في Settings**
3. **تحقق من Database Tables:**
   - `ai_settings`
   - `ai_requests`
   - `ai_autopilot_settings`

4. **راجع الوثائق:**
   - `AI_FEATURES_IMPLEMENTATION.md`
   - `AI_FEATURES_SUMMARY_AR.md`
   - `FINAL_IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist

قبل استخدام AI Features:

- [ ] API Key مُضاف في `/settings/ai`
- [ ] Provider مُفعّل
- [ ] GMB متصل
- [ ] Dashboard مُحدّث (F5)
- [ ] Scroll للأسفل في Dashboard
- [ ] Console خالي من الأخطاء

---

**تاريخ الإنشاء:** 15 نوفمبر 2025  
**الحالة:** ✅ مكتمل  
**النسخة:** 1.0

