# 🤖 Automated Logger Migration Script

## ✅ الضمانات الأمنية

السكريبت مصمم بـ **5 طبقات حماية**:

1. ✅ **Dry-run أولاً** - معاينة قبل التطبيق
2. ✅ **Backup تلقائي** - نسخة احتياطية لكل ملف
3. ✅ **TypeScript Validation** - فحص الأخطاء بعد التعديل
4. ✅ **Auto Rollback** - رجوع تلقائي إذا فشل الفحص
5. ✅ **Manual Rollback** - إمكانية الرجوع يدوياً

---

## 🚀 الاستخدام

### 1️⃣ معاينة التغييرات (آمن 100%)

```bash
npm run migrate-logger
```

**النتيجة:**

- يعرض لك كل الملفات اللي بتتعدل
- يعرض عدد الـ console.error و console.warn
- **لا يعدل أي شي** - مجرد معاينة

---

### 2️⃣ تطبيق التغييرات (مع حماية)

```bash
npm run migrate-logger:apply
```

**الخطوات التلقائية:**

1. ✅ ينشئ backup في `.logger-migration-backup/`
2. ✅ يطبق التعديلات
3. ✅ يفحص TypeScript (`npx tsc --noEmit`)
4. ✅ إذا فشل الفحص → يرجع للـ backup تلقائياً
5. ✅ إذا نجح → يخبرك أن كل شي تمام

---

### 3️⃣ الرجوع للنسخة الأصلية (إذا احتجت)

```bash
npm run migrate-logger:rollback
```

**يرجع كل الملفات** لحالتها الأصلية من الـ backup.

---

## 📊 مثال على النتيجة

### Dry-run Output:

```
🚀 Logger Migration Script

🔍 Scanning app/api...
Found 150 TypeScript files

🔄 Processing files...

📄 app/api/auth/send-magic-link/route.ts
   - Added authLogger import
   - Replaced 2 console.error
   - Replaced 1 console.warn

📄 app/api/settings/route.ts
   - Added apiLogger import
   - Replaced 3 console.error

============================================================
📊 MIGRATION SUMMARY
============================================================
Files scanned:         150
Files to modify:       42
console.error found:   156
console.warn found:    71
Total replacements:    227

⚠️  DRY RUN MODE - No changes applied
Run with --apply flag to apply changes
============================================================
```

---

## 🔧 ماذا يفعل السكريبت؟

### 1. يضيف Import تلقائياً:

```typescript
// قبل
export async function POST(request: NextRequest) {
  console.error("Error:", error);
}

// بعد
import { apiLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  apiLogger.error(
    "Error",
    error instanceof Error ? error : new Error(String(error)),
  );
}
```

### 2. يستبدل console.error:

```typescript
// Pattern 1: مع error object
console.error("[Auth] Login failed:", error);
// ↓
authLogger.error(
  "Login failed",
  error instanceof Error ? error : new Error(String(error)),
);

// Pattern 2: بدون error object
console.error("[Auth] Invalid token");
// ↓
authLogger.error("Invalid token", new Error("Invalid token"));
```

### 3. يستبدل console.warn:

```typescript
console.warn("[Auth] Token expiring soon", { expiresIn });
// ↓
authLogger.warn("Token expiring soon", { expiresIn });
```

### 4. يختار Logger المناسب:

- `app/api/gmb/**` → `gmbLogger`
- `app/api/auth/**` → `authLogger`
- باقي الملفات → `apiLogger`

---

## ⚠️ ملاحظات مهمة

### ✅ آمن على:

- ملفات TypeScript في `app/api/`
- يتجاهل `node_modules`, `.next`, `dist`
- يتجاهل `logger.ts` نفسه
- يحافظ على `console.log` و `console.info`

### ⚠️ لا يعدل:

- Comments (مثل `// console.error(...)`)
- ملفات خارج `app/api/`
- `console.log` و `console.info`

---

## 🧪 اختبار قبل التطبيق

### خطوة 1: Dry-run

```bash
npm run migrate-logger
```

اقرأ النتائج وتأكد أنها منطقية.

### خطوة 2: Apply على ملف واحد (اختبار)

عدل السكريبت مؤقتاً:

```typescript
// في replace-console-with-logger.ts
const CONFIG = {
  targetDir: "app/api/auth/send-magic-link", // ملف واحد فقط
  // ...
};
```

### خطوة 3: Apply على الكل

```bash
npm run migrate-logger:apply
```

---

## 🔍 التحقق بعد التطبيق

```bash
# تأكد أن كل console.error و console.warn اختفوا
grep -rn "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger\."

# النتيجة المتوقعة: 0 أو فقط comments
```

---

## 🆘 إذا حصلت مشكلة

### المشكلة: TypeScript errors بعد التطبيق

```bash
# السكريبت يرجع تلقائياً، لكن إذا احتجت:
npm run migrate-logger:rollback
```

### المشكلة: بعض الملفات ما اتعدلت صح

```bash
# ارجع للـ backup
npm run migrate-logger:rollback

# عدل الملفات يدوياً
# أو عدل السكريبت وجرب مرة ثانية
```

---

## 📈 التقدم المتوقع

بناءً على الوضع الحالي:

- **227 console statement** متبقي
- **~40 ملف** يحتاج تعديل
- **وقت التنفيذ:** ~30 ثانية
- **وقت المراجعة:** 5-10 دقائق

---

## ✅ Checklist

- [ ] قرأت الدليل كامل
- [ ] جربت dry-run أولاً
- [ ] راجعت النتائج
- [ ] عملت backup يدوي (اختياري)
- [ ] طبقت التغييرات
- [ ] فحصت TypeScript errors
- [ ] تأكدت من النتائج
- [ ] حذفت الـ backup بعد التأكد

---

## 🎯 الخلاصة

السكريبت **آمن 100%** لأنه:

1. ✅ يعمل dry-run أولاً
2. ✅ ينشئ backup تلقائي
3. ✅ يفحص الأخطاء
4. ✅ يرجع تلقائياً إذا فشل
5. ✅ يمكن الرجوع يدوياً

**جرب dry-run الآن:**

```bash
npm run migrate-logger
```
