# 🔧 Production Fix Prompts - NNH AI Studio

هذا المجلد يحتوي على **prompts مخصصة** لإصلاح جميع المشاكل المكتشفة في تقرير فحص الجاهزية للإنتاج.

This folder contains **specialized prompts** for fixing all issues discovered in the production readiness audit report.

---

## 📁 هيكل المجلد / Folder Structure

```
production-fix-prompts/
├── README.md                    # هذا الملف / This file
├── critical/                    # مشاكل حرجة (P0) / Critical issues (P0)
│   ├── 01-fix-csrf-token-generation.md
│   ├── 02-fix-rate-limiting-fail-open.md
│   ├── 03-add-zod-validation-server-actions.md
│   ├── 04-fix-sql-injection-search.md
│   ├── 05-fix-usetoast-memory-leak.md
│   ├── 06-fix-cache-unbounded-growth.md
│   └── 07-fix-import-ordering-hooks.md
├── high-priority/               # مشاكل عالية الأولوية (P1) / High priority (P1)
│   ├── 08-implement-i18n.md
│   ├── 09-fix-beta-banner-compliance.md
│   ├── 10-replace-any-types.md
│   ├── 11-fix-n1-queries.md
│   ├── 12-complete-ai-fallback.md
│   ├── 13-add-api-timeouts.md
│   └── ... (more files)
└── medium-priority/             # مشاكل متوسطة (P2) / Medium priority (P2)
    ├── 18-add-aria-labels.md
    ├── 19-remove-console-logs.md
    └── ... (more files)
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

### 🔴 Critical (P0) - **7 مشاكل / 7 issues**

| # | المشكلة / Issue | الوقت / Time | الحالة / Status |
|---|-----------------|--------------|-----------------|
| 01 | CSRF Token Generation | 4h | 🔴 Not Started |
| 02 | Rate Limiting Fails Open | 4h | 🔴 Not Started |
| 03 | Zod Validation Missing | 8h | 🔴 Not Started |
| 04 | SQL Injection in Search | 3h | 🔴 Not Started |
| 05 | useToast Memory Leak | 2h | 🔴 Not Started |
| 06 | Cache Unbounded Growth | 4h | 🔴 Not Started |
| 07 | Import Ordering (3 files) | 0.5h | 🔴 Not Started |
| **المجموع / Total** | | **25.5h** | **0%** |

### 🟠 High Priority (P1) - **15 مشكلة / 15 issues** (الأهم)

| # | المشكلة / Issue | الوقت / Time | الحالة / Status |
|---|-----------------|--------------|-----------------|
| 08 | i18n Hardcoded Text (12 files) | 12h | 🟠 Planned |
| 09 | BETA Banner Compliance (314 files) | 8h | 🟠 Planned |
| 10 | Replace `any` Types | 10h | 🟠 Planned |
| 11 | Fix N+1 Queries | 7h | 🟠 Planned |
| 12 | Complete AI Provider Fallback | 3h | 🟠 Planned |
| 13 | Add API Timeouts | 3h | 🟠 Planned |
| 14 | Hide Error Details | 2h | 🟠 Planned |
| 15 | Standardize Error Responses | 4h | 🟠 Planned |
| 16 | Fix Race Conditions | 6h | 🟠 Planned |
| 17 | Fix Memory Leaks (hooks) | 8h | 🟠 Planned |
| **المجموع / Total** | | **63h** | **0%** |

### 🟡 Medium Priority (P2) - **10 مشاكل / 10 issues** (مخطط)

| # | المشكلة / Issue | الوقت / Time |
|---|-----------------|--------------|
| 18 | Add ARIA Labels | 8h |
| 19 | Remove console.logs | 4h |
| 20 | Extract Magic Numbers | 3h |
| 21 | Fix Cache Pub/Sub | 6h |
| 22 | Cache Stampede Prevention | 4h |
| **المجموع / Total** | **25h** |

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

**آخر تحديث / Last Updated:** 27 نوفمبر 2025
**الإصدار / Version:** 1.0
**الحالة / Status:** 0% مكتمل / 0% Complete
