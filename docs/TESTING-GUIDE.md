# 🧪 دليل الاختبارات - NNH AI Studio

## 📋 ملخص سريع

| الاختبار     | الأمر                                                    | الوقت     | الوصف                   |
| ------------ | -------------------------------------------------------- | --------- | ----------------------- |
| Integration  | `npm run test:integration`                               | ~8 ثواني  | اختبار Supabase و OAuth |
| Schema Check | `npm run test:integration -- schema-consistency.test.ts` | ~16 ثانية | **تطابق الكود مع DB**   |
| Unit         | `npm run test:unit`                                      | ~30 ثانية | اختبار الوحدات          |
| E2E          | `npm run test:e2e:golden`                                | ~2 دقيقة  | اختبار المتصفح          |
| Type Check   | `npm run type-check`                                     | ~1 دقيقة  | فحص TypeScript          |
| Lint         | `npm run lint`                                           | ~30 ثانية | فحص جودة الكود          |
| الكل         | `npm run validate:system`                                | ~3 دقائق  | كل الفحوصات             |

---

## 🔴 الأهم: Schema Consistency Test

هذا الاختبار **يكشف المشاكل الحقيقية** مثل:

- ❌ استخدام جدول خاطئ (`gmb_services` بدل `gmb_accounts`)
- ❌ استخدام عمود خاطئ (`account_id` بدل `gmb_account_id`)
- ❌ جدول مفقود من الـ database

### التشغيل:

```bash
npm run test:integration -- schema-consistency.test.ts
```

### ما يفحصه:

1. **Auto-Detect**: يفحص كل `.from("table")` في الكود ويتأكد أن الجدول موجود
2. **Column Names**: يتأكد من أسماء الأعمدة الصحيحة
3. **Foreign Keys**: يتأكد أن الـ FK references صحيحة
4. **Critical Flows**: يتأكد أن OAuth → Sync يستخدم الجداول الصحيحة

---

## 1️⃣ اختبارات Integration (Supabase + OAuth)

### ما تختبره:

- ✅ الاتصال بـ Supabase
- ✅ CRUD operations (إنشاء/قراءة/تحديث/حذف)
- ✅ OAuth flow
- ✅ API endpoints
- ✅ Data integrity (FK, Unique constraints)
- ✅ RLS (Row Level Security)

### المتطلبات:

```bash
# في .env.local يجب أن يكون:
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # مطلوب للاختبارات
TEST_USER_ID="uuid-من-auth.users"    # مطلوب لـ CRUD tests
GOOGLE_CLIENT_ID="xxx"               # مطلوب لـ OAuth tests
```

### التشغيل:

```bash
# تشغيل كل اختبارات Integration
npm run test:integration

# تشغيل اختبار معين
npm run test:integration -- --testNamePattern="Database Connection"

# تشغيل ملف معين
npm run test:integration -- supabase-crud.test.ts
```

### الملفات:

- `tests/integration/supabase-crud.test.ts` - اختبارات CRUD
- `tests/integration/oauth-flow.test.ts` - اختبارات OAuth
- `tests/integration/api-endpoints.test.ts` - اختبارات API

---

## 2️⃣ اختبارات Unit

### ما تختبره:

- ✅ Functions و utilities
- ✅ Hooks
- ✅ Components (isolated)
- ✅ Business logic

### التشغيل:

```bash
# تشغيل كل اختبارات Unit
npm run test:unit

# تشغيل مع coverage
npm run test:coverage

# تشغيل في وضع watch
npm run test:watch
```

### الملفات:

- `tests/unit/` - كل اختبارات الوحدات

---

## 3️⃣ اختبارات E2E (Playwright)

### ما تختبره:

- ✅ User journeys كاملة
- ✅ Navigation
- ✅ Authentication flow
- ✅ UI interactions
- ✅ Responsive design

### المتطلبات:

```bash
# تثبيت المتصفحات (مرة واحدة)
npm run test:e2e:install

# يجب أن يكون الـ dev server شغال
npm run dev
```

### التشغيل:

```bash
# تشغيل Golden Path فقط (الأهم)
npm run test:e2e:golden

# تشغيل كل E2E tests
npm run test:e2e

# تشغيل مع عرض المتصفح
npm run test:e2e:headed

# عرض التقرير
npx playwright show-report
```

### الملفات:

- `tests/e2e/golden-path.spec.ts` - المسار الذهبي

---

## 4️⃣ Type Check (TypeScript)

### ما يفحصه:

- ✅ أخطاء TypeScript
- ✅ Types صحيحة
- ✅ Imports صحيحة

### التشغيل:

```bash
npm run type-check
```

---

## 5️⃣ Lint (ESLint)

### ما يفحصه:

- ✅ جودة الكود
- ✅ Best practices
- ✅ Security issues
- ✅ Unused variables

### التشغيل:

```bash
# فحص فقط
npm run lint

# فحص وإصلاح تلقائي
npm run lint -- --fix
```

---

## 🚀 قبل الإنتاج (Production Checklist)

### الأمر الشامل:

```bash
npm run validate:system
```

### أو خطوة بخطوة:

```bash
# 1. Integration Tests
npm run test:integration
# ✅ يجب: 50/50 passed

# 2. Unit Tests
npm run test:unit
# ✅ يجب: كل الاختبارات تنجح

# 3. Type Check
npm run type-check
# ✅ يجب: 0 errors

# 4. Lint
npm run lint
# ✅ يجب: 0 errors (warnings مقبولة)

# 5. E2E Tests (اختياري لكن مهم)
npm run dev  # في terminal منفصل
npm run test:e2e:golden
# ✅ يجب: أغلب الاختبارات تنجح
```

---

## 🔧 حل المشاكل الشائعة

### مشكلة: "Supabase connection timeout"

```bash
# تأكد من وجود المفاتيح في .env.local
cat .env.local | grep SUPABASE
```

### مشكلة: "TEST_USER_ID not found"

```bash
# احصل على UUID من Supabase Dashboard > Authentication > Users
# أو شغل:
# SELECT id FROM auth.users LIMIT 1;
```

### مشكلة: "E2E server not available"

```bash
# شغل الـ dev server أولاً
npm run dev

# ثم في terminal آخر
npm run test:e2e:golden
```

### مشكلة: "Playwright browsers not installed"

```bash
npm run test:e2e:install
```

---

## 📊 تفسير النتائج

### ✅ نجاح كامل:

```
Test Suites: 3 passed, 3 total
Tests:       50 passed, 50 total
```

### ⚠️ بعض التخطي (مقبول):

```
Tests: 15 skipped, 35 passed, 50 total
```

- التخطي عادة بسبب missing credentials

### ❌ فشل (يحتاج إصلاح):

```
Tests: 5 failed, 45 passed, 50 total
```

- راجع رسائل الخطأ
- أصلح المشاكل قبل الإنتاج

---

## 📁 هيكل ملفات الاختبارات

```
tests/
├── integration/           # اختبارات Integration
│   ├── jest.config.js     # إعدادات Jest للـ integration
│   ├── jest.setup.ts      # Setup file
│   ├── supabase-crud.test.ts
│   ├── oauth-flow.test.ts
│   └── api-endpoints.test.ts
│
├── unit/                  # اختبارات Unit
│   ├── env.test.ts
│   ├── sync-worker.test.ts
│   └── ...
│
├── e2e/                   # اختبارات E2E (Playwright)
│   └── golden-path.spec.ts
│
└── __mocks__/             # Mock files
    ├── fileMock.js
    └── styleMock.js
```

---

## 🎯 أولويات الاختبار

| الأولوية   | الاختبار    | السبب                         |
| ---------- | ----------- | ----------------------------- |
| 🔴 عالي    | Integration | يتأكد من عمل Database و OAuth |
| 🔴 عالي    | Type Check  | يمنع أخطاء runtime            |
| 🟡 متوسط   | Unit Tests  | يختبر logic معزول             |
| 🟡 متوسط   | Lint        | يحسن جودة الكود               |
| 🟢 اختياري | E2E         | يختبر user experience         |

---

## 📝 ملاحظات مهمة

1. **لا تنشر بدون Integration tests** - هذه تتأكد من عمل الـ database
2. **Type errors = bugs** - أصلحها دائماً
3. **Lint warnings مقبولة** - لكن errors لا
4. **E2E قد تفشل بسبب console warnings** - هذا طبيعي في development

---

آخر تحديث: ديسمبر 2025
