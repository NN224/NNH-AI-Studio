# 🔵 Low Priority: Code Quality Improvements

> **Priority:** P3 - Nice to have
> **Categories:** prefer-const, TODOs, cleanup tasks
> **Impact:** Code maintainability and readability

---

## 1. prefer-const (4 instances)

### Issue

Using `let` when the variable is never reassigned.

### Fix

```typescript
// ❌ BEFORE
let data = fetchData();
return data;

// ✅ AFTER
const data = fetchData();
return data;
```

### Auto-fix

```bash
npm run lint -- --fix
```

---

## 2. TODO/FIXME Comments (15 instances)

### Files with TODOs

| File                                             | Count | Description        |
| ------------------------------------------------ | ----- | ------------------ |
| `components/home/home-page-content.tsx`          | 2     | UI improvements    |
| `components/settings/data-management.tsx`        | 2     | Export features    |
| `lib/gmb/pubsub-helpers.ts`                      | 2     | Pub/Sub setup      |
| `components/analytics/custom-report-builder.tsx` | 1     | Report features    |
| `components/reviews/ReviewAISettings.tsx`        | 1     | AI settings        |
| `components/reviews/bulk-action-bar.tsx`         | 1     | Bulk actions       |
| `server/actions/questions-management.ts`         | 1     | Q&A features       |
| `lib/i18n/stub.ts`                               | 1     | i18n setup         |
| `lib/services/ml-questions-service.ts`           | 1     | ML features        |
| `app/api/ai/actions/save-replies/route.ts`       | 1     | Save functionality |
| `app/api/locations/[id]/update/route.ts`         | 1     | Update logic       |
| `app/api/newsletter/route.ts`                    | 1     | Newsletter         |

### Action Items

For each TODO:

1. **Implement** if it's critical for production
2. **Create Issue** if it's a future enhancement
3. **Remove** if it's no longer relevant

### Example TODOs to Address

```typescript
// TODO: Add error boundary - IMPLEMENT for production
// TODO: Optimize query - Create performance issue
// TODO: Remove this hack when API is fixed - Check if still needed
// FIXME: Memory leak - CRITICAL - fix before production
```

---

## 3. Cleanup Tasks

### 3.1 Empty Backup Folder

**Issue:** `.logger-migration-backup/` contains backup files that should be removed.

**Fix:**

```bash
# Check what's in the folder
ls -la .logger-migration-backup/

# If backups are no longer needed
rm -rf .logger-migration-backup/

# Add to .gitignore to prevent future backups from being committed
echo ".logger-migration-backup/" >> .gitignore
```

### 3.2 Unused Error Boundary

**File:** `components/home/home-error-boundary.tsx` (123 lines)

**Check if used:**

```bash
grep -rn "HomeErrorBoundary" --include="*.ts" --include="*.tsx"
```

**If not used:** Delete the file or integrate it into the app.

### 3.3 Name Conflicts

**Issue:** `HomePageContent` exists in 2 files

**Files:**

- `components/home/home-page-content.tsx`
- `app/[locale]/home/page.tsx` (likely imports from the first)

**Fix:** Ensure exports are unique or rename one of them.

### 3.4 Wrapper Layer Cleanup

**Issue:** 4 layers of wrappers in `home/` components

**Structure to simplify:**

```
home/
├── HomePageWrapper         (1)
│   └── HomePageProvider    (2)
│       └── HomePageLayout  (3)
│           └── HomeContent (4)
```

**Consider merging:**

```
home/
├── HomePageProvider (combines context + layout)
│   └── HomeContent
```

---

## 4. Import Organization

### Recommended Import Order

```typescript
// 1. React/Next.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { z } from "zod";
import { toast } from "sonner";

// 3. Internal components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 4. Internal utilities/hooks
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";

// 5. Types
import type { User } from "@/lib/types";

// 6. Styles (if any)
import styles from "./Component.module.css";
```

### Auto-sort Imports

Add to `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

---

## 5. Type Definition Organization

### Current Issues

Some type definitions are scattered:

- `lib/types/database.ts` - Database types ✓
- `lib/types/chat-types.ts` - Chat types ✓
- Inline types in components ✗

### Recommended Structure

```
lib/types/
├── index.ts           # Re-exports all types
├── database.ts        # Supabase table types
├── api.ts             # API request/response types
├── gmb.ts             # Google My Business types
├── youtube.ts         # YouTube types
├── ai.ts              # AI service types
└── common.ts          # Shared utility types
```

### Example `index.ts`:

```typescript
// lib/types/index.ts
export * from "./database";
export * from "./api";
export * from "./gmb";
export * from "./youtube";
export * from "./ai";
export * from "./common";
```

---

## 6. Error Handling Standardization

### Current State

- Mix of `try-catch` patterns
- Inconsistent error responses
- Some errors swallowed silently

### Recommended Pattern

```typescript
// lib/utils/api-response.ts
import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status },
  );
}

// Usage in API routes
export async function GET() {
  try {
    const data = await fetchData();
    return successResponse(data);
  } catch (error) {
    logger.error("Fetch failed", { error });
    return errorResponse("Failed to fetch data", 500);
  }
}
```

---

## 7. Documentation

### Files Needing JSDoc

High-priority for documentation:

- `lib/services/*.ts` - All service functions
- `lib/utils/*.ts` - Utility functions
- `hooks/*.ts` - Custom hooks

### Example JSDoc:

```typescript
/**
 * Fetches locations for the current user with optional filtering.
 *
 * @param userId - The authenticated user's ID
 * @param filters - Optional filters for the query
 * @param filters.status - Filter by location status
 * @param filters.label - Filter by location label
 * @returns Promise resolving to array of locations
 * @throws {AuthError} If user is not authenticated
 * @throws {DatabaseError} If query fails
 *
 * @example
 * const locations = await getLocations(userId, { status: 'active' });
 */
export async function getLocations(
  userId: string,
  filters?: LocationFilters,
): Promise<GMBLocation[]> {
  // ...
}
```

---

## ✅ Acceptance Criteria

- [ ] All `let` → `const` where possible
- [ ] TODOs reviewed and addressed
- [ ] Backup folder cleaned up
- [ ] Unused files removed
- [ ] Consistent import ordering
- [ ] Types centralized in `lib/types/`
- [ ] Error handling standardized
- [ ] Key functions documented with JSDoc

---

## 📋 Checklist

### Quick Wins

- [ ] Run `npm run lint -- --fix` for auto-fixable issues
- [ ] Remove `.logger-migration-backup/` folder
- [ ] Add folder to `.gitignore`

### Medium Effort

- [ ] Review and address all TODOs
- [ ] Organize imports in key files
- [ ] Remove unused error boundary (if confirmed unused)

### Longer Term

- [ ] Standardize error handling across all API routes
- [ ] Add JSDoc to all service functions
- [ ] Simplify component wrapper hierarchy

---

_Estimated Fix Time: 2-4 hours_
