# 🟠 High Priority: Add Retry Logic to API Calls

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## Problem Summary

No retry logic found in API calls. Network failures, temporary server issues, or rate limits cause immediate failures without recovery attempts.

## Severity: 🟠 High Priority

- **Impact**: Poor user experience, unnecessary failures
- **Effort**: 3-4 hours
- **Risk**: Medium - affects reliability

## Affected Areas

- All fetch calls in components (111 calls)
- All API route external calls (Google APIs, AI providers)
- Database operations that may timeout

## Current Code (Bad)

```typescript
const response = await fetch("/api/data");
if (!response.ok) {
  throw new Error("Failed"); // ❌ No retry
}
```

## Required Fix

```typescript
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // Retry on 5xx errors or rate limits
      if (response.status >= 500 || response.status === 429) {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
          continue;
        }
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Step-by-Step Fix

### Step 1: Create retry utility

```typescript
// lib/utils/fetch-retry.ts
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retries?: number; retryDelay?: number },
): Promise<Response> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options || {};

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Don't retry client errors (4xx except 429)
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        return response;
      }

      // Retry server errors and rate limits
      if (response.status >= 500 || response.status === 429) {
        if (attempt < retries - 1) {
          const backoff = retryDelay * Math.pow(2, attempt);
          console.warn(`Retry ${attempt + 1}/${retries} after ${backoff}ms`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      const backoff = retryDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw new Error("Max retries exceeded");
}
```

### Step 2: Use in critical API calls

```typescript
// Before
const res = await fetch("/api/gmb/sync");

// After
import { fetchWithRetry } from "@/lib/utils/fetch-retry";
const res = await fetchWithRetry("/api/gmb/sync", { retries: 3 });
```

### Step 3: Add to external API calls

```typescript
// Google API calls
const response = await fetchWithRetry(
  `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}`,
  {
    headers: { Authorization: `Bearer ${token}` },
    retries: 3,
    retryDelay: 2000,
  },
);
```

## Acceptance Criteria

- [ ] Retry utility created in lib/utils/
- [ ] Critical API calls use retry logic
- [ ] External API calls (Google, AI) have retries
- [ ] Exponential backoff implemented
- [ ] Rate limit (429) triggers retry

## Verification

```bash
grep -rn "fetchWithRetry" --include="*.ts" --include="*.tsx" .
# Should find usage in critical files
```

## Status: ⏳ Pending
