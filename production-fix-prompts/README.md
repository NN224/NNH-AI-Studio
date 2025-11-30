# 🔧 Production Fix Prompts - NNH AI Studio

> ## ⚠️ تحذير للـ AI Agents - قبل أي إصلاح!
>
> **يجب قراءة الملف التالي أولاً:**
>
> ```
> AI_AGENT_START_HERE.md
> ```
>
> ### القواعد الإلزامية:
>
> 1. ✅ **اقرأ الملف المستهدف كاملاً** قبل أي تعديل
> 2. ✅ **افهم السياق** - اقرأ الملفات المرتبطة إذا لزم
> 3. ✅ **لا تكسر الهيكل** - حافظ على try/catch و imports
> 4. ✅ **اختبر** - `npm run lint` و `npm run build` بعد كل تعديل
> 5. ✅ **Deploy** - `npx vercel --prod` بعد الانتهاء
>
> ### ❌ ممنوع:
>
> - تعديل جزئي بدون قراءة الملف كاملاً
> - إنشاء ملفات جديدة غير ضرورية
> - ترك أخطاء lint

---

هذا المجلد يحتوي على **prompts مخصصة** لإصلاح جميع المشاكل المكتشفة في تقرير فحص الجاهزية للإنتاج.

This folder contains **specialized prompts** for fixing all issues discovered in the production readiness audit report.

---

## 📁 هيكل المجلد / Folder Structure

```
production-fix-prompts/
├── README.md                    # هذا الملف
├── critical/                    # 🔴 مشاكل حرجة (P0) - 18 ملف
│   ├── 00-fix-database-schema-gaps.md
│   ├── 01-fix-csrf-token-generation.md
│   ├── 02-fix-rate-limiting-fail-open.md
│   ├── 03-add-zod-validation-server-actions.md
│   ├── 04-fix-sql-injection-search.md
│   ├── 05-fix-usetoast-memory-leak.md
│   ├── 06-fix-cache-unbounded-growth.md
│   ├── 07-fix-import-ordering-hooks.md
│   ├── 08-fix-sync-hooks-issues.md
│   ├── 09-fix-rate-limiting-distributed.md
│   ├── 10-fix-cron-secret-required.md
│   ├── 11-fix-csrf-middleware-activation.md
│   ├── 12-fix-error-message-leakage.md
│   ├── 13-fix-ai-rate-limiting.md
│   ├── 14-fix-rls-bypass.md
│   ├── 15-fix-input-validation.md
│   ├── 16-fix-json-parse-safety.md
│   ├── 17-fix-empty-catch-blocks.md
│   ├── 18-fix-api-routes-no-auth.md      # 🆕 NEW - Nov 30
│   ├── 19-fix-lint-errors.md             # 🆕 NEW - Nov 30
│   └── 20-fix-hydration-errors.md        # 🆕 NEW - Nov 30
├── high-priority/               # 🟠 مشاكل عالية (P1) - 13 ملف
│   ├── 08-implement-i18n.md
│   ├── 09-fix-beta-banner-compliance.md
│   ├── 10-replace-any-types.md
│   ├── 16-fix-home-dashboard-sync.md
│   ├── 17-fix-request-timeout.md
│   ├── 18-fix-console-error-sentry.md
│   ├── 19-fix-cache-invalidation.md
│   ├── 20-fix-promise-all-error-handling.md
│   ├── 21-fix-onclick-debounce.md
│   ├── 22-fix-unused-imports-variables.md  # 🆕 NEW
│   ├── 23-fix-console-log-removal.md       # 🆕 NEW
│   ├── 24-add-fetch-abort-controller.md    # 🆕 NEW
│   └── 25-add-retry-logic-api-calls.md     # 🆕 NEW
└── medium-priority/             # 🟡 مشاكل متوسطة (P2) - 18 ملف
    ├── 22-fix-usestate-types.md
    ├── 23-fix-return-null-loading.md
    ├── 24-fix-event-listener-cleanup.md
    ├── 25-fix-memory-leaks-settimeout.md
    ├── 26-fix-ssr-window-document.md
    ├── 27-fix-code-splitting.md
    ├── 28-fix-memoization.md
    ├── 29-fix-hardcoded-values.md
    ├── 30-fix-types-organization.md
    ├── 31-fix-accessibility.md
    ├── 32-fix-error-boundaries.md
    ├── 33-fix-health-check.md
    ├── 34-fix-throw-error-classes.md
    ├── 36-fix-settimeout-cleanup.md        # 🆕 NEW
    ├── 37-fix-localstorage-ssr.md          # 🆕 NEW
    ├── 38-fix-env-validation.md            # 🆕 NEW
    ├── 39-improve-accessibility-aria.md    # 🆕 NEW
    └── 40-fix-explicit-any-types.md        # 🆕 NEW
```

---

## 🎯 كيفية الاستخدام / How to Use

### للمطورين البشريين / For Human Developers:

1. **اختر ملف حسب الأولوية**
   Pick a file based on priority

   ```bash
   # ابدأ بالحرجة / Start with critical
   cat production-fix-prompts/critical/01-fix-csrf-token-generation.md
   ```

2. **اقرأ المشكلة والحل**
   Read the problem and solution

3. **اتبع الخطوات**
   Follow the steps provided

4. **اختبر الإصلاح**
   Test the fix using provided test cases

---

### لـ AI Agents:

كل prompt مصمم ليكون **مكتفي ذاتياً** ويحتوي على:

Each prompt is **self-contained** and includes:

1. ✅ **وصف دقيق للمشكلة** / Exact problem description
2. ✅ **الكود الحالي (المعطوب)** / Current (broken) code
3. ✅ **الحل المطلوب** / Required fix
4. ✅ **خطوات التنفيذ** / Implementation steps
5. ✅ **معايير القبول** / Acceptance criteria
6. ✅ **كود الاختبار** / Test code
7. ✅ **الملفات المتأثرة** / Affected files

#### استخدام AI Agent:

```bash
# طريقة 1: نسخ محتوى الـ prompt
cat production-fix-prompts/critical/01-fix-csrf-token-generation.md | pbcopy

# ثم الصقه في Claude/GPT/etc

# طريقة 2: استخدام CLI
claude code --prompt="$(cat production-fix-prompts/critical/01-fix-csrf-token-generation.md)"
```

---

## 📊 ملخص المشاكل / Issues Summary

### 🔴 Critical (P0) - **16 مشكلة / 16 issues**

| #                   | المشكلة / Issue                | الوقت / Time | الحالة / Status |
| ------------------- | ------------------------------ | ------------ | --------------- |
| 00                  | Database Schema Gaps           | 4h           | ✅ Completed    |
| 01                  | CSRF Token Generation          | 4h           | ✅ Completed    |
| 02                  | Rate Limiting Fails Open       | 4h           | 🔴 Not Started  |
| 03                  | Zod Validation Missing         | 8h           | 🔴 Not Started  |
| 04                  | SQL Injection in Search        | 3h           | 🔴 Not Started  |
| 05                  | useToast Memory Leak           | 2h           | 🔴 Not Started  |
| 06                  | Cache Unbounded Growth         | 4h           | 🔴 Not Started  |
| 07                  | Import Ordering (3 files)      | 0.5h         | 🔴 Not Started  |
| 08                  | Sync Hooks Issues              | 3h           | 🔴 Not Started  |
| 09                  | **Rate Limiting Distributed**  | 6h           | 🔴 Not Started  |
| 10                  | **CRON_SECRET Required**       | 2h           | 🔴 Not Started  |
| 11                  | **CSRF Middleware Activation** | 3h           | 🔴 Not Started  |
| 12                  | **Error Message Leakage**      | 2h           | 🔴 Not Started  |
| 13                  | **AI Rate Limiting**           | 3h           | 🔴 Not Started  |
| 14                  | **RLS Bypass**                 | 4h           | 🔴 Not Started  |
| 15                  | **Input Validation**           | 6h           | 🔴 Not Started  |
| 16                  | **JSON.parse Safety**          | 3h           | 🔴 Not Started  |
| **المجموع / Total** |                                | **61.5h**    | **12%**         |

### 🟠 High Priority (P1) - **9 ملفات**

| #                   | المشكلة / Issue            | الوقت / Time | الحالة / Status |
| ------------------- | -------------------------- | ------------ | --------------- |
| 08                  | i18n Hardcoded Text        | 12h          | 🟠 Planned      |
| 09                  | BETA Banner Compliance     | 8h           | 🟠 Planned      |
| 10                  | Replace `any` Types        | 10h          | ✅ Completed    |
| 16                  | Fix Home Dashboard Sync    | 4h           | 🟠 Planned      |
| 17                  | Request Timeout            | 3h           | 🔴 Not Started  |
| 18                  | console.error → Sentry     | 4h           | 🔴 Not Started  |
| 19                  | Cache Invalidation         | 4h           | 🔴 Not Started  |
| 20                  | Promise.all Error Handling | 3h           | 🔴 Not Started  |
| 21                  | onClick Debounce           | 4h           | 🔴 Not Started  |
| **المجموع / Total** |                            | **52h**      | **11%**         |

### 🟡 Medium Priority (P2) - **13 ملف**

| #                   | المشكلة / Issue         | الوقت / Time | الحالة / Status |
| ------------------- | ----------------------- | ------------ | --------------- |
| 22                  | useState Types          | 2h           | 🔴 Not Started  |
| 23                  | return null → Loading   | 3h           | 🔴 Not Started  |
| 24                  | Event Listener Cleanup  | 3h           | 🔴 Not Started  |
| 25                  | Memory Leaks setTimeout | 3h           | 🔴 Not Started  |
| 26                  | SSR window/document     | 2h           | 🔴 Not Started  |
| 27                  | Code Splitting          | 4h           | 🔴 Not Started  |
| 28                  | Memoization             | 3h           | 🔴 Not Started  |
| 29                  | Hardcoded Values        | 2h           | 🔴 Not Started  |
| 30                  | Types Organization      | 4h           | 🔴 Not Started  |
| 31                  | Accessibility (a11y)    | 6h           | 🔴 Not Started  |
| 32                  | Error Boundaries        | 3h           | 🔴 Not Started  |
| 33                  | Health Check            | 2h           | 🔴 Not Started  |
| 34                  | Custom Error Classes    | 3h           | 🔴 Not Started  |
| **المجموع / Total** |                         | **40h**      | **0%**          |

---

## 🚀 خطة الإصلاح الموصى بها / Recommended Fix Plan

### المرحلة 1: الأسبوع الأول (Critical) / Week 1 (Critical)

**الهدف:** إصلاح جميع المشاكل الحرجة
**Goal:** Fix all critical issues

```bash
# اليوم 1-2 / Day 1-2: Security
01-fix-csrf-token-generation.md       # 4h
02-fix-rate-limiting-fail-open.md     # 4h

# اليوم 3 / Day 3: Quick fixes + validation
07-fix-import-ordering-hooks.md       # 0.5h
05-fix-usetoast-memory-leak.md        # 2h
04-fix-sql-injection-search.md        # 3h

# اليوم 4-5 / Day 4-5: Complex fixes
03-add-zod-validation-server-actions.md  # 8h
06-fix-cache-unbounded-growth.md         # 4h
```

**إجمالي المرحلة 1:** 25.5 ساعة (3-5 أيام)
**Phase 1 Total:** 25.5 hours (3-5 days)

---

### المرحلة 2: الأسبوع الثاني (High Priority) / Week 2 (High Priority)

```bash
# اليوم 6-7 / Day 6-7: i18n
08-implement-i18n.md                  # 12h

# اليوم 8 / Day 8: UI fixes
09-fix-beta-banner-compliance.md      # 8h

# اليوم 9-10 / Day 9-10: Type safety + Performance
10-replace-any-types.md               # 10h
11-fix-n1-queries.md                  # 7h
12-complete-ai-fallback.md            # 3h
13-add-api-timeouts.md                # 3h
```

**إجمالي المرحلة 2:** 43 ساعة (5-6 أيام)
**Phase 2 Total:** 43 hours (5-6 days)

---

## 📝 متابعة التقدم / Progress Tracking

### كيفية تحديث الحالة / How to Update Status:

```bash
# بعد إصلاح مشكلة / After fixing an issue:
# 1. ضع ✅ بجانب المشكلة في ISSUES_TRACKER.csv
# 2. حدث حالة الملف

# مثال / Example:
sed -i 's/🔴 Not Started/✅ Completed/' production-fix-prompts/critical/01-fix-csrf-token-generation.md
```

### التتبع الآلي / Automated Tracking:

```bash
# عدد المشاكل المحلولة / Count completed issues
grep -r "✅ Completed" production-fix-prompts/ | wc -l

# عدد المشاكل المتبقية / Count remaining issues
grep -r "🔴 Not Started" production-fix-prompts/ | wc -l
```

---

## 🧪 الاختبار / Testing

### قبل وضع علامة "مكتمل" / Before Marking "Completed":

كل prompt يحتوي على قسم **Acceptance Criteria**.
Each prompt contains an **Acceptance Criteria** section.

**يجب استيفاء جميع المعايير:**
**ALL criteria must be met:**

- [ ] الكود يعمل بدون أخطاء / Code works without errors
- [ ] الاختبارات تمر بنجاح / Tests pass
- [ ] TypeScript يعمل / TypeScript compiles
- [ ] لا توجد تحذيرات أمنية / No security warnings
- [ ] الوثائق محدثة / Documentation updated

---

## 📚 مراجع إضافية / Additional References

- **التقرير الشامل:** `PRODUCTION_READINESS_AUDIT_REPORT.md`
- **جدول التتبع:** `ISSUES_TRACKER.csv`
- **قاعدة البيانات:** `google-api-docs/DATABASE_SCHEMA.md`
- **إرشادات المشروع:** `CLAUDE.md`

---

## ⚠️ ملاحظات مهمة / Important Notes

### للمطورين / For Developers:

1. **لا تتخطى المشاكل الحرجة**
   DO NOT skip critical issues - they block production

2. **اختبر جيداً**
   Test thoroughly - security fixes are critical

3. **اطلب مراجعة الكود**
   Request code review for security-related fixes

4. **لا تدمج مباشرة في main**
   DO NOT merge directly to main

### لـ AI Agents:

1. **اقرأ الـ prompt كاملاً**
   Read the entire prompt before starting

2. **اتبع الخطوات بالترتيب**
   Follow steps in order

3. **لا تتخطى الاختبارات**
   DO NOT skip tests

4. **اطلب توضيح إذا كان هناك غموض**
   Ask for clarification if prompt is ambiguous

---

## 🎯 الهدف النهائي / End Goal

**قبل / Before:**

- ❌ 25 مشاكل حرجة
- ❌ 67 مشاكل عالية
- ❌ غير جاهز للإنتاج

**بعد / After:**

- ✅ 0 مشاكل حرجة
- ✅ < 5 مشاكل عالية
- ✅ جاهز للإنتاج

---

## 📞 الدعم / Support

إذا واجهت مشكلة في أي prompt:
If you encounter issues with any prompt:

1. راجع `PRODUCTION_READINESS_AUDIT_REPORT.md` للسياق
   Review audit report for context

2. تحقق من `ISSUES_TRACKER.csv` للتفاصيل
   Check issues tracker for details

3. اطلع على `CLAUDE.md` للإرشادات العامة
   See CLAUDE.md for general guidelines

---

**نتمنى لك التوفيق! 🚀**
**Good luck! 🚀**

---

**آخر تحديث / Last Updated:** 30 نوفمبر 2025
**الإصدار / Version:** 1.1
**الحالة / Status:** 43% مكتمل (9/21 Critical) / 43% Complete (9/21 Critical)
