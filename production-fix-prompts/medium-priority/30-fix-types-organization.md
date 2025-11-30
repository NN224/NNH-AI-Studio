# 🟡 MEDIUM PRIORITY: Types مبعثرة

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 4 ساعات
> **المجال:** صيانة

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-030
**Severity:** 🟡 MEDIUM - MAINTAINABILITY
**Impact:** صعوبة إيجاد وإعادة استخدام Types

---

## 🎯 المشكلة بالتفصيل

الـ Types مبعثرة في أماكن متعددة:

1. بعضها في `/types`
2. بعضها في `/lib/types`
3. بعضها inline في components
4. صعوبة إيجاد الـ type المطلوب

---

## 📁 الملفات المتأثرة

```
types/dashboard.ts (9 exports)
types/features.ts (6 exports)
lib/types/*.ts
components/**/*.tsx (inline types)
```

---

## ✅ الحل المطلوب

### هيكل Types الجديد

```
types/
├── index.ts           # Re-exports all types
├── api.ts             # API request/response types
├── auth.ts            # Authentication types
├── database.ts        # Database/Supabase types
├── gmb.ts             # Google My Business types
├── dashboard.ts       # Dashboard types
├── components.ts      # Shared component props
└── utils.ts           # Utility types
```

### types/index.ts

```typescript
// types/index.ts
// Central export for all types

export * from "./api";
export * from "./auth";
export * from "./database";
export * from "./gmb";
export * from "./dashboard";
export * from "./components";
export * from "./utils";
```

### types/api.ts

```typescript
// types/api.ts

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### types/gmb.ts

```typescript
// types/gmb.ts

export interface GMBAccount {
  id: string;
  user_id: string;
  account_name: string;
  account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GMBLocation {
  id: string;
  gmb_account_id: string;
  user_id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  status: "active" | "inactive" | "pending";
  created_at: string;
  updated_at: string;
}

export interface GMBReview {
  id: string;
  location_id: string;
  reviewer_name: string;
  rating: number;
  comment?: string;
  reply?: string;
  replied_at?: string;
  created_at: string;
}

export interface GMBQuestion {
  id: string;
  location_id: string;
  question_text: string;
  answer?: string;
  answered_at?: string;
  created_at: string;
}
```

### types/components.ts

```typescript
// types/components.ts

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps {
  isLoading: boolean;
  error?: Error | null;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface FormProps<T> {
  initialValues?: Partial<T>;
  onSubmit: (values: T) => Promise<void>;
  isSubmitting?: boolean;
}
```

### استخدام الـ Types

```typescript
// قبل
interface Location {
  id: string;
  name: string;
  // ... تعريف متكرر
}

// بعد
import type { GMBLocation } from "@/types";

function LocationCard({ location }: { location: GMBLocation }) {
  // ...
}
```

---

## 🔍 خطوات التنفيذ

```bash
# 1. أنشئ الهيكل الجديد
mkdir -p types

# 2. ابحث عن جميع الـ types
grep -rn "interface\|type " components/ lib/ --include="*.ts" --include="*.tsx"

# 3. انقل الـ types للملفات المناسبة

# 4. حدث الـ imports
```

---

## ✅ معايير القبول

- [ ] جميع الـ types في `/types` directory
- [ ] `types/index.ts` يُصدِّر كل الـ types
- [ ] لا توجد inline types في components (إلا للـ props الخاصة)
- [ ] الـ imports تستخدم `@/types`

---

**Status:** 🔴 NOT STARTED
