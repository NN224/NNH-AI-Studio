# 🟡 Medium Priority: Fix Remaining Explicit Any Types

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## Problem Summary

Multiple `@typescript-eslint/no-explicit-any` warnings remain. These reduce type safety and make refactoring risky.

## Severity: 🟡 Medium Priority

- **Impact**: Type safety, maintainability
- **Effort**: 3-4 hours
- **Risk**: Low

## Affected Files (Examples)

```
app/[locale]/(dashboard)/media/MediaClient.tsx:18,73,107
app/[locale]/(dashboard)/settings/auto-pilot/page.tsx:224
```

## Current Code (Bad)

```typescript
// ❌ Explicit any
const handleData = (data: any) => {
  console.log(data.name);
};

// ❌ Any in state
const [items, setItems] = useState<any[]>([]);

// ❌ Any in function return
function parseResponse(res: Response): any {
  return res.json();
}
```

## Required Fix

```typescript
// ✅ Proper interface
interface DataItem {
  name: string;
  value: number;
}

const handleData = (data: DataItem) => {
  console.log(data.name);
};

// ✅ Typed state
const [items, setItems] = useState<DataItem[]>([]);

// ✅ Typed return
async function parseResponse<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}
```

## Step-by-Step Fix

### Step 1: Find all explicit any

```bash
npm run lint 2>&1 | grep "no-explicit-any"
```

### Step 2: For each any, determine proper type:

#### API Response

```typescript
// Before
const data: any = await response.json();

// After
interface ApiResponse {
  success: boolean;
  data: LocationData[];
}
const data: ApiResponse = await response.json();
```

#### Event Handlers

```typescript
// Before
const handleChange = (e: any) => {};

// After
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
```

#### Unknown Data

```typescript
// Before
function process(data: any) {}

// After
function process(data: unknown) {
  if (typeof data === "object" && data !== null) {
    // Type guard
  }
}
```

#### Third-party Library

```typescript
// Before
const result: any = externalLib.doSomething();

// After
// Create type definition or use unknown
const result: unknown = externalLib.doSomething();
```

### Step 3: Create shared types

```typescript
// types/api.ts
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

## Acceptance Criteria

- [ ] No `@typescript-eslint/no-explicit-any` warnings
- [ ] All API responses have proper types
- [ ] Event handlers use React types
- [ ] Unknown data uses `unknown` with type guards
- [ ] Shared types in `types/` directory

## Verification

```bash
npm run lint 2>&1 | grep -c "no-explicit-any"
# Should be 0
```

## Status: ⏳ Pending
