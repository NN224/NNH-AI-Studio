# 🔴 High Priority: `any` Types in API Routes

> **Priority:** P1 - Should Fix Soon
> **Count:** ~150 instances
> **Impact:** Type safety, maintainability, potential runtime errors

---

## Overview

The `any` type bypasses TypeScript's type checking, which can lead to:

- Runtime errors that TypeScript would have caught
- Poor IDE autocomplete/intellisense
- Harder debugging and maintenance

---

## 📊 Files with Most `any` Types (API Routes)

| File                                                    | Count | Priority  |
| ------------------------------------------------------- | ----- | --------- |
| `app/api/features/profile/[locationId]/route.ts`        | 17    | 🔴 High   |
| `app/api/locations/optimized/route.ts`                  | 6     | 🔴 High   |
| `app/api/locations/export/route.ts`                     | 5     | 🟠 Medium |
| `app/api/locations/[id]/route.ts`                       | 5     | 🟠 Medium |
| `app/api/cron/daily-insights/route.ts`                  | 5     | 🟠 Medium |
| `app/api/settings/route.ts`                             | 4     | 🟠 Medium |
| `app/api/locations/list-data/route.ts`                  | 4     | 🟠 Medium |
| `app/api/locations/[id]/logo/route.ts`                  | 4     | 🟡 Low    |
| `app/api/locations/[id]/cover/route.ts`                 | 4     | 🟡 Low    |
| `app/api/locations/[id]/branding/route.ts`              | 4     | 🟡 Low    |
| `app/api/gmb/location/[locationId]/attributes/route.ts` | 4     | 🟡 Low    |

---

## 1. `app/api/features/profile/[locationId]/route.ts` (17 any)

### Common Patterns to Fix

#### Pattern 1: Untyped Request Body

```typescript
// ❌ BEFORE
const body = (await request.json()) as any;

// ✅ AFTER
import { z } from "zod";

const UpdateProfileSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  categories: z.array(z.string()).optional(),
});

type UpdateProfileBody = z.infer<typeof UpdateProfileSchema>;

const parseResult = UpdateProfileSchema.safeParse(await request.json());
if (!parseResult.success) {
  return NextResponse.json(
    { error: "Invalid request body", details: parseResult.error.errors },
    { status: 400 },
  );
}
const body: UpdateProfileBody = parseResult.data;
```

#### Pattern 2: Untyped Database Response

```typescript
// ❌ BEFORE
const { data, error } = await supabase
  .from("gmb_locations")
  .select("*")
  .single();

const location = data as any;

// ✅ AFTER
import type { Database } from "@/lib/types/database";

type GMBLocation = Database["public"]["Tables"]["gmb_locations"]["Row"];

const { data, error } = await supabase
  .from("gmb_locations")
  .select("*")
  .single();

// With properly typed Supabase client (using Database type), data is inferred
// Alternatively, cast the result:
const location = data as GMBLocation | null;
```

#### Pattern 3: Untyped Google API Response

```typescript
// ❌ BEFORE
const googleResponse: any = await fetch(googleApiUrl);
const googleData = await googleResponse.json();

// ✅ AFTER
interface GoogleLocationResponse {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
    regionCode: string;
  };
  regularHours?: {
    periods: Array<{
      openDay: string;
      openTime: string;
      closeDay: string;
      closeTime: string;
    }>;
  };
}

const googleResponse = await fetch(googleApiUrl);
const googleData: GoogleLocationResponse = await googleResponse.json();
```

---

## 2. `app/api/locations/optimized/route.ts` (6 any)

### Typical Fixes

```typescript
// ❌ BEFORE
function processLocations(locations: any[]) {
  return locations.map((loc: any) => ({
    id: loc.id,
    name: loc.name,
  }));
}

// ✅ AFTER
interface LocationInput {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

interface LocationOutput {
  id: string;
  name: string;
}

function processLocations(locations: LocationInput[]): LocationOutput[] {
  return locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
  }));
}
```

---

## 3. `app/api/locations/export/route.ts` (5 any)

### Export Data Types

```typescript
// ❌ BEFORE
const exportData: any[] = locations.map((loc: any) => ({
  ...loc,
  formattedAddress: formatAddress(loc),
}));

// ✅ AFTER
import type { GMBLocation } from "@/lib/types/database";

interface ExportRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews_count: number;
  formattedAddress: string;
}

const exportData: ExportRow[] = locations.map((loc: GMBLocation) => ({
  id: loc.id,
  name: loc.name || "",
  address: loc.address || "",
  phone: loc.phone || "",
  website: loc.website || "",
  rating: loc.rating || 0,
  reviews_count: loc.reviews_count || 0,
  formattedAddress: formatAddress(loc),
}));
```

---

## 🛠️ Step-by-Step Fix Process

### Step 1: Identify `any` locations

```bash
npm run lint 2>&1 | grep "no-explicit-any" | grep "app/api"
```

### Step 2: Create/Update Type Definitions

Create or update types in `lib/types/`:

- `database.ts` - Database table types
- `api-types.ts` - API request/response types
- `google-api.ts` - Google API response types

### Step 3: Replace `any` with Proper Types

For each `any`:

1. Determine what the actual type should be
2. If no type exists, create one
3. Use Zod for runtime validation when needed

### Step 4: Verify Changes

```bash
npm run lint
npm run build
```

---

## 📝 Type Definition Templates

### API Request Body Type

```typescript
// lib/types/api-types.ts
import { z } from "zod";

export const LocationUpdateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/)
    .optional(),
  website: z.string().url().optional(),
  categories: z.array(z.string()).max(10).optional(),
});

export type LocationUpdateRequest = z.infer<typeof LocationUpdateSchema>;
```

### API Response Type

```typescript
// lib/types/api-types.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LocationResponse {
  id: string;
  name: string;
  address: string;
  // ... other fields
}
```

---

## ✅ Acceptance Criteria

- [ ] All API routes have typed request bodies
- [ ] All database queries return typed results
- [ ] All external API responses are typed
- [ ] No `any` type in API routes
- [ ] Build passes without errors

---

## 🔗 Related Files

- `lib/types/database.ts` - Database types
- `lib/types/gmb-types.ts` - GMB-specific types
- `lib/validations/` - Zod validation schemas

---

_Estimated Fix Time: 3-4 hours_
