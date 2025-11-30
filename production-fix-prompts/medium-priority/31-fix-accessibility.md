# 🟡 MEDIUM PRIORITY: غياب Accessibility (a11y)

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 6 ساعات
> **المجال:** UX + قانوني

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-031
**Severity:** 🟡 MEDIUM - ACCESSIBILITY
**Impact:** التطبيق غير قابل للاستخدام لذوي الاحتياجات الخاصة

---

## 🎯 المشكلة بالتفصيل

عدم وجود ARIA labels و accessibility features:

1. Screen readers لا تعمل بشكل صحيح
2. Keyboard navigation غير مكتملة
3. Color contrast قد يكون ضعيف
4. قد يخالف قوانين ADA/WCAG

---

## 📁 الملفات المتأثرة

```
components/ui/*.tsx
components/dashboard/*.tsx
components/locations/*.tsx
```

---

## ✅ الحل المطلوب

### إضافة ARIA Labels

```typescript
// قبل
<button onClick={handleClick}>
  <Icon />
</button>

// بعد
<button
  onClick={handleClick}
  aria-label="Delete item"
  title="Delete item"
>
  <Icon aria-hidden="true" />
</button>
```

### Keyboard Navigation

```typescript
// قبل
<div onClick={handleClick}>
  Clickable content
</div>

// بعد
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick();
    }
  }}
  aria-label="Clickable content"
>
  Clickable content
</div>
```

### Form Labels

```typescript
// قبل
<input type="text" placeholder="Email" />

// بعد
<div>
  <label htmlFor="email" className="sr-only">
    Email address
  </label>
  <input
    id="email"
    type="email"
    placeholder="Email"
    aria-describedby="email-error"
  />
  {error && (
    <p id="email-error" role="alert" className="text-red-500">
      {error}
    </p>
  )}
</div>
```

### Skip Links

```typescript
// components/layout/skip-link.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded"
    >
      Skip to main content
    </a>
  );
}

// في layout.tsx
<body>
  <SkipLink />
  <Header />
  <main id="main-content">
    {children}
  </main>
</body>
```

### Focus Management

```typescript
// hooks/use-focus-trap.ts
import { useEffect, useRef } from "react";

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    firstElement?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}
```

### Screen Reader Only Text

```css
/* globals.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 🔍 خطوات التنفيذ

```bash
# 1. تثبيت أدوات الفحص
npm install -D eslint-plugin-jsx-a11y

# 2. إضافة للـ ESLint config
# eslint.config.mjs
import jsxA11y from "eslint-plugin-jsx-a11y";

# 3. فحص الـ accessibility
npx eslint --ext .tsx components/

# 4. استخدام axe-core للاختبار
npm install -D @axe-core/react
```

---

## ✅ معايير القبول

- [ ] جميع الـ buttons لها aria-label
- [ ] جميع الـ images لها alt text
- [ ] جميع الـ forms لها labels
- [ ] Keyboard navigation يعمل
- [ ] Skip link موجود
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] eslint-plugin-jsx-a11y لا يُظهر errors

---

**Status:** 🔴 NOT STARTED
