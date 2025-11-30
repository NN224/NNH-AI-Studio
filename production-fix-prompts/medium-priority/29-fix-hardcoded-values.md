# 🟡 MEDIUM PRIORITY: Hardcoded URLs و Magic Numbers

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 2 ساعات
> **المجال:** صيانة

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-029
**Severity:** 🟡 MEDIUM - MAINTAINABILITY
**Impact:** صعوبة التعديل والصيانة

---

## 🎯 المشكلة بالتفصيل

وجود قيم hardcoded في الكود:

1. URLs مكتوبة مباشرة
2. أرقام بدون تفسير (magic numbers)
3. Timeouts و limits بدون constants

---

## 📁 الملفات المتأثرة

```bash
# ابحث عن hardcoded URLs
grep -rn "https://\|http://" app/ components/ lib/ --include="*.ts" --include="*.tsx"

# ابحث عن magic numbers
grep -rn "[0-9]\{4,\}" components/ --include="*.tsx"
```

---

## ✅ الحل المطلوب

### إنشاء Constants File

```typescript
// lib/constants/index.ts

// ============================================================================
// API ENDPOINTS
// ============================================================================
export const API_ENDPOINTS = {
  GMB: {
    BASE: "https://mybusinessbusinessinformation.googleapis.com/v1",
    ACCOUNTS: "/accounts",
    LOCATIONS: "/locations",
  },
  GOOGLE_MAPS: {
    EMBED: "https://www.google.com/maps/embed/v1/place",
    GEOCODE: "https://maps.googleapis.com/maps/api/geocode/json",
  },
} as const;

// ============================================================================
// TIMEOUTS (in milliseconds)
// ============================================================================
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  SYNC_OPERATION: 120000, // 2 minutes
  POLLING_INTERVAL: 5000, // 5 seconds
  DEBOUNCE: 300, // 300ms
  TOAST_DURATION: 5000, // 5 seconds
} as const;

// ============================================================================
// LIMITS
// ============================================================================
export const LIMITS = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  FILE_UPLOAD: {
    MAX_SIZE_MB: 10,
    MAX_SIZE_BYTES: 10 * 1024 * 1024,
  },
  TEXT: {
    MAX_REVIEW_RESPONSE: 4000,
    MAX_POST_CONTENT: 1500,
    MAX_QUESTION_ANSWER: 1000,
  },
  RATE_LIMIT: {
    FREE_TIER: 10,
    PRO_TIER: 100,
    ENTERPRISE_TIER: 1000,
  },
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================
export const UI = {
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
  },
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  Z_INDEX: {
    DROPDOWN: 50,
    MODAL: 100,
    TOAST: 150,
    TOOLTIP: 200,
  },
} as const;

// ============================================================================
// SYNC CONSTANTS
// ============================================================================
export const SYNC = {
  MAX_CONCURRENT_REQUESTS: 5,
  REQUEST_DELAY_MS: 200,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  TOKEN_REFRESH_BUFFER_MS: 300000, // 5 minutes
} as const;
```

### استخدام الـ Constants

```typescript
// قبل
const response = await fetch(url, { timeout: 30000 });
if (items.length > 100) { ... }

// بعد
import { TIMEOUTS, LIMITS } from "@/lib/constants";

const response = await fetch(url, { timeout: TIMEOUTS.API_REQUEST });
if (items.length > LIMITS.PAGINATION.MAX_PAGE_SIZE) { ... }
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `lib/constants/index.ts`
- [ ] جميع URLs تستخدم constants
- [ ] جميع timeouts تستخدم constants
- [ ] جميع limits تستخدم constants
- [ ] لا توجد magic numbers في الكود

---

**Status:** 🔴 NOT STARTED
