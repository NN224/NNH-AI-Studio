# 🔴 CRITICAL FIX: JSON.parse بدون Try-Catch

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 3 ساعات
> **المجال:** استقرار

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-016
**Severity:** 🔴 CRITICAL - SERVER CRASH
**Impact:** يمكن أن يسبب crash للـ server

---

## 🎯 المشكلة بالتفصيل

استخدام `JSON.parse()` بدون try-catch:

1. إذا كان الـ JSON invalid، يرمي exception
2. Exception غير معالج يسبب crash
3. يمكن للمهاجم إرسال invalid JSON لإسقاط السيرفر

---

## 📁 الملفات المتأثرة

```bash
# ابحث عن JSON.parse بدون try-catch
grep -rn "JSON.parse" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// ❌ مثال على استخدام خطير
export async function POST(request: Request) {
  const body = await request.text();

  // ❌ إذا body ليس JSON صالح، السيرفر يتوقف!
  const data = JSON.parse(body);

  // لن يصل الكود هنا إذا فشل JSON.parse
}
```

```typescript
// ❌ مثال آخر في component
function loadSettings() {
  const stored = localStorage.getItem("settings");

  // ❌ إذا stored تالف، التطبيق يتوقف!
  const settings = JSON.parse(stored);
}
```

**لماذا هذا خطير:**

- Server crash = downtime
- DoS attack عبر إرسال invalid JSON
- User experience سيء
- Data loss محتمل

---

## ✅ الحل المطلوب

### Step 1: إنشاء Safe JSON Utilities

```typescript
// lib/utils/safe-json.ts

/**
 * Safely parses JSON string with error handling.
 * Returns null if parsing fails instead of throwing.
 *
 * @example
 * const data = safeJsonParse<User>(jsonString);
 * if (data === null) {
 *   // Handle invalid JSON
 * }
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback?: T,
): T | null {
  if (json === null || json === undefined || json === "") {
    return fallback ?? null;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn("[safeJsonParse] Failed to parse JSON:", {
      preview: json.substring(0, 100),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return fallback ?? null;
  }
}

/**
 * Safely parses JSON with validation using Zod schema.
 * Returns typed result or null if invalid.
 *
 * @example
 * const user = safeJsonParseWithSchema(jsonString, userSchema);
 */
export function safeJsonParseWithSchema<T>(
  json: string | null | undefined,
  schema: import("zod").ZodSchema<T>,
): T | null {
  const parsed = safeJsonParse<unknown>(json);

  if (parsed === null) {
    return null;
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    console.warn("[safeJsonParseWithSchema] Validation failed:", {
      errors: result.error.errors,
    });
    return null;
  }

  return result.data;
}

/**
 * Safely stringifies value to JSON.
 * Returns null if stringification fails.
 */
export function safeJsonStringify(
  value: unknown,
  space?: number,
): string | null {
  try {
    return JSON.stringify(value, null, space);
  } catch (error) {
    console.warn("[safeJsonStringify] Failed to stringify:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Parses JSON from Request body safely.
 * Returns error response if parsing fails.
 */
export async function parseRequestJson<T>(
  request: Request,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const text = await request.text();

    if (!text || text.trim() === "") {
      return { data: null, error: "Request body is empty" };
    }

    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { data: null, error: `Failed to parse JSON: ${message}` };
  }
}
```

### Step 2: إنشاء React Hook للـ localStorage

```typescript
// hooks/use-local-storage.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { safeJsonParse, safeJsonStringify } from "@/lib/utils/safe-json";

/**
 * React hook for safely reading/writing to localStorage.
 * Handles JSON parsing errors gracefully.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const item = localStorage.getItem(key);
    const parsed = safeJsonParse<T>(item);

    if (parsed !== null) {
      setStoredValue(parsed);
    }
  }, [key]);

  // Return a wrapped version of useState's setter function
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;

        // Save to localStorage
        if (typeof window !== "undefined") {
          const stringified = safeJsonStringify(valueToStore);
          if (stringified !== null) {
            localStorage.setItem(key, stringified);
          }
        }

        return valueToStore;
      });
    },
    [key],
  );

  // Remove from localStorage
  const removeValue = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
```

### Step 3: تحديث API Routes

```typescript
// ✅ الطريقة الصحيحة
// app/api/example/route.ts
import { parseRequestJson } from "@/lib/utils/safe-json";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // ✅ Safe JSON parsing
  const { data, error } = await parseRequestJson<{ message: string }>(request);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  // ✅ data is typed and guaranteed to be valid JSON
  console.log(data.message);

  return NextResponse.json({ success: true });
}
```

### Step 4: تحديث Components

```typescript
// ✅ الطريقة الصحيحة
// components/settings/settings-panel.tsx
"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";

interface Settings {
  theme: "light" | "dark";
  notifications: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  notifications: true,
};

export function SettingsPanel() {
  // ✅ Safe localStorage access
  const [settings, setSettings] = useLocalStorage<Settings>(
    "user-settings",
    DEFAULT_SETTINGS
  );

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              notifications: e.target.checked,
            }))
          }
        />
        Enable notifications
      </label>
    </div>
  );
}
```

### Step 5: ESLint Rule

```javascript
// eslint-rules/no-unsafe-json-parse.js
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow JSON.parse without try-catch or safe wrapper",
    },
    fixable: "code",
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "JSON" &&
          node.callee.property.name === "parse"
        ) {
          // Check if inside try-catch
          let parent = node.parent;
          let inTryCatch = false;

          while (parent) {
            if (parent.type === "TryStatement") {
              inTryCatch = true;
              break;
            }
            parent = parent.parent;
          }

          if (!inTryCatch) {
            context.report({
              node,
              message:
                "JSON.parse must be wrapped in try-catch or use safeJsonParse(). " +
                "Unhandled JSON parsing errors can crash the application.",
              suggest: [
                {
                  desc: "Use safeJsonParse instead",
                  fix(fixer) {
                    const sourceCode = context.getSourceCode();
                    const arg = node.arguments[0];
                    const argText = sourceCode.getText(arg);
                    return fixer.replaceText(node, `safeJsonParse(${argText})`);
                  },
                },
              ],
            });
          }
        }
      },
    };
  },
};
```

---

## 🔍 خطوات التنفيذ

### Step 1: إنشاء Safe JSON Utilities

```bash
touch lib/utils/safe-json.ts
touch hooks/use-local-storage.ts
```

### Step 2: البحث عن جميع JSON.parse

```bash
# ابحث عن جميع الاستخدامات
grep -rn "JSON.parse" app/ lib/ components/ hooks/ --include="*.ts" --include="*.tsx"

# عدد الاستخدامات
grep -rn "JSON.parse" app/ lib/ components/ hooks/ --include="*.ts" --include="*.tsx" | wc -l
```

### Step 3: تحديث كل استخدام

```bash
# لكل استخدام:
# 1. إذا في API route: استخدم parseRequestJson
# 2. إذا في component مع localStorage: استخدم useLocalStorage
# 3. إذا في utility: استخدم safeJsonParse
```

### Step 4: إضافة ESLint Rule

```bash
# أضف الـ rule للـ eslint config
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم إنشاء `safe-json.ts` مع جميع الـ utilities
- [ ] تم إنشاء `use-local-storage.ts` hook
- [ ] جميع `JSON.parse` في API routes تستخدم `parseRequestJson`
- [ ] جميع `JSON.parse` في components تستخدم `safeJsonParse` أو `useLocalStorage`
- [ ] لا يوجد `JSON.parse` بدون try-catch أو safe wrapper
- [ ] تم إضافة ESLint rule لمنع الاستخدام الخاطئ
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: Invalid JSON في API

```bash
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d 'not valid json'

# يجب أن يرجع 400 مع رسالة خطأ، ليس 500
```

### Test 2: Corrupted localStorage

```javascript
// في browser console
localStorage.setItem("user-settings", "corrupted{json");

// ثم reload الصفحة
// يجب ألا يتوقف التطبيق
```

### Test 3: Unit Tests

```typescript
// tests/lib/utils/safe-json.test.ts
import { safeJsonParse, safeJsonStringify } from "@/lib/utils/safe-json";

describe("safeJsonParse", () => {
  it("should parse valid JSON", () => {
    expect(safeJsonParse('{"a": 1}')).toEqual({ a: 1 });
  });

  it("should return null for invalid JSON", () => {
    expect(safeJsonParse("not json")).toBeNull();
  });

  it("should return fallback for invalid JSON", () => {
    expect(safeJsonParse("not json", { default: true })).toEqual({
      default: true,
    });
  });

  it("should handle null input", () => {
    expect(safeJsonParse(null)).toBeNull();
  });

  it("should handle undefined input", () => {
    expect(safeJsonParse(undefined)).toBeNull();
  });

  it("should handle empty string", () => {
    expect(safeJsonParse("")).toBeNull();
  });
});

describe("safeJsonStringify", () => {
  it("should stringify valid objects", () => {
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
  });

  it("should handle circular references", () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(safeJsonStringify(obj)).toBeNull();
  });
});
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- `JSON.parse()` بدون try-catch
- `JSON.parse()` بدون validation للنتيجة
- تجاهل أخطاء الـ parsing
- استخدام `eval()` بدلاً من `JSON.parse()`

### ✅ مطلوب:

- استخدام `safeJsonParse` أو try-catch
- Fallback values للحالات الفاشلة
- Logging للأخطاء
- Type validation للنتيجة

---

## 📚 مراجع

- [MDN JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [Error Handling Best Practices](https://www.toptal.com/nodejs/node-js-error-handling)

---

**Status:** 🔴 NOT STARTED
**Blocked By:** None
**Blocks:** Production deployment

---

**هذا إصلاح حرج للاستقرار. JSON.parse بدون try-catch = server crash!** 💥
