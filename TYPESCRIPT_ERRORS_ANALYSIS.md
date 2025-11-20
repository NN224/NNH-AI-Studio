# TypeScript Errors Analysis

**Total Errors: 427**
**Generated:** 2025-11-20
**Project:** NNH AI Studio

---

## Error Categories

### Category 1: Null/Undefined Checks (TS18047, TS18048)
**Count:** ~220 errors (51% of all errors)
**Priority:** HIGH (affects all priority levels)

**Description:** 'supabase' or other variables are possibly 'null'

**Common Pattern:**
```typescript
// ERROR: 'supabase' is possibly 'null'
const { data } = await supabase.from('table').select();
```

**Fix Strategy:**
```typescript
// SOLUTION 1: Add null check
if (!supabase) {
  throw new Error('Supabase client not available');
}
const { data } = await supabase.from('table').select();

// SOLUTION 2: Use optional chaining with fallback
const data = await supabase?.from('table').select();
if (!data) return null;

// SOLUTION 3: Assert non-null (only if guaranteed)
const { data } = await supabase!.from('table').select();
```

**Affected Files by Priority:**

#### Priority 1: Authentication & Security (13 errors)
- `app/[locale]/auth/login/page.tsx` (3 errors - lines 44, 73, 96)
- `app/[locale]/auth/signup/page.tsx` (2 errors - lines 49, 74)
- `app/[locale]/auth/reset/page.tsx` (1 error - line 29)
- `app/[locale]/auth/update-password/page.tsx` (1 error - line 52)
- `lib/services/auth-service.ts` (10 errors - lines 8, 28, 36, 51, 65, 75, 85, 106, 116, 128)
- `lib/utils/auth-helpers.ts` (1 error - line 35)
- `lib/hooks/use-supabase.ts` (3 errors - lines 21, 47, 62)

#### Priority 2: GMB Sync (0 errors - no null checks needed)

#### Priority 3: API Routes (6 errors)
- `app/api/webhooks/gmb-notifications/route.ts` (2 errors - lines 204, 205)
- `app/api/notifications/route.ts` (2 errors - implicit any)
- `app/api/reviews/analyze-sentiment/route.ts` (2 errors - lines 128, 128)

#### Priority 4: Components & Hooks (200+ errors)
- Dashboard components (20+ errors)
- Analytics components (50+ errors)
- Settings components (30+ errors)
- Locations components (20+ errors)
- Reviews/Questions components (20+ errors)
- Media components (10+ errors)
- Hooks (30+ errors)
- Services (20+ errors)

---

### Category 2: Missing Type Exports (TS2305)
**Count:** 13 errors (3% of all errors)
**Priority:** CRITICAL (blocks compilation)

**Description:** Module '@/lib/types/ai' has no exported members

**Missing Types:**
- `AutomationStatus` (3 files)
- `ChatMessage` (2 files)
- `ChatResponse` (2 files)
- `AIInsightsResponse` (2 files)
- `AIInsight` (2 files)
- `AIPrediction` (2 files)
- `AIAnomaly` (2 files)
- `UpcomingAction` (1 file)
- `AutomationLog` (1 file)
- `AIProviderConfig` (1 file)
- `AIRequest` (1 file)

**Affected Files:**
- `app/api/ai/automation-status/route.ts` (line 8)
- `app/api/ai/chat/route.ts` (lines 9, 9)
- `app/api/ai/insights/route.ts` (lines 9, 9, 9, 9)
- `components/dashboard/ai/ai-insights-panel.tsx` (lines 28 x4)
- `components/dashboard/ai/automation-insights.tsx` (lines 23 x3)
- `components/dashboard/ai/chat-assistant.tsx` (lines 25 x2)
- `lib/ai/provider.ts` (lines 7 x2)

**Fix Strategy:**
```typescript
// Check if lib/types/ai.ts exists
// If not, create it with all required type definitions
// If yes, add missing exports
```

---

### Category 3: Read-only Property Assignments (TS2540)
**Count:** 8 errors (2% of all errors)
**Priority:** MEDIUM

**Description:** Cannot assign to read-only properties

**Affected Files:**
- `app/api/features/profile/[locationId]/route.ts` (lines 237-244)
  - facebook, instagram, twitter, whatsapp, youtube, linkedin, tiktok, pinterest

**Fix Strategy:**
```typescript
// BEFORE (ERROR):
profile.socialLinks.facebook = facebookUrl;

// SOLUTION 1: Create new object
const profile = {
  ...existing,
  socialLinks: {
    ...existing.socialLinks,
    facebook: facebookUrl,
    instagram: instagramUrl,
    // ...
  }
};

// SOLUTION 2: Type assertion if truly mutable
(profile.socialLinks as any).facebook = facebookUrl;

// SOLUTION 3: Update type definition to make properties writable
```

---

### Category 4: Implicit 'any' Types (TS7006, TS7031, TS7034, TS7005)
**Count:** ~40 errors (9% of all errors)
**Priority:** MEDIUM

**Description:** Variables/parameters implicitly have 'any' type

**Affected Files:**
- `app/api/notifications/route.ts` (2 errors - line 44, 85)
- `app/api/reviews/analyze-sentiment/route.ts` (1 error - line 128)
- `components/dashboard/ai/ai-insights-panel.tsx` (10 errors - lines 165-392)
- `components/dashboard/ai/automation-insights.tsx` (2 errors - lines 160, 180)
- `components/media/*` (15+ errors - all media components)
- `components/questions/AutoAnswerTesting.tsx` (1 error - line 47)

**Fix Strategy:**
```typescript
// BEFORE (ERROR):
const handleClick = (item) => { ... }

// SOLUTION:
const handleClick = (item: MediaItem) => { ... }

// For destructured props:
// BEFORE:
const Component = ({ items, onDelete }) => { ... }

// SOLUTION:
interface Props {
  items: MediaItem[];
  onDelete: (id: string) => void;
}
const Component = ({ items, onDelete }: Props) => { ... }
```

---

### Category 5: Incorrect Function Signatures (TS2554)
**Count:** 13 errors (3% of all errors)
**Priority:** HIGH

**Description:** Expected N arguments, but got M

**Affected Files:**
- `app/api/gmb/notifications/setup/route.ts` (13 errors - lines 23, 38, 42, 76, 93, 113, 132, 140, 155, 159, 205, 213, 242)

**Pattern:** Function calls with wrong number of arguments (expected 1, got 3 or 4)

**Fix Strategy:**
```typescript
// Need to check the function definition and fix the calls
// Example:
// If function expects: fn(arg1: string)
// But called as: fn(arg1, arg2, arg3)
// Either fix the call or update the function signature
```

---

### Category 6: Type Mismatches (TS2322, TS2345, TS2741)
**Count:** ~50 errors (12% of all errors)
**Priority:** MEDIUM-HIGH

**Subcategories:**

#### 6a. Component Prop Type Mismatches
**Affected Files:**
- `components/analytics/analytics-dashboard.tsx` (11 errors - lines 62-116)
  - Issue: Passing `locationIds` prop that doesn't exist in component types

**Fix Strategy:** Add `locationIds?: string[]` to component prop types

#### 6b. Missing Required Properties
**Example:**
- `app/api/features/profile/[locationId]/route.ts` (line 694)
  - Property 'socialLinks' is missing

**Fix Strategy:** Ensure all required properties are included in object literals

#### 6c. Type Assignment Incompatibilities
**Examples:**
- `lib/gmb/helpers.ts` (line 100): `Type 'string | null' is not assignable to type 'string'`
- `server/actions/auto-reply.ts` (line 449): Same issue
- `server/actions/gmb-sync.ts` (line 68): `Type 'string | undefined' is not assignable to type 'null'`

**Fix Strategy:** Add null checks or type assertions

---

### Category 7: Missing Properties/Members (TS2339, TS2551, TS2552, TS2304)
**Count:** ~30 errors (7% of all errors)
**Priority:** MEDIUM-HIGH

**Examples:**
- `components/features/bulk-update-dialog.tsx` (lines 148, 154): Property 'error'/'summary' does not exist on type 'Response'
- `components/questions/bulk-actions-bar.tsx` (lines 74, 77): Same issue
- `components/settings/gmb-settings.tsx` (lines 113-155): 30+ "Cannot find name" errors (businessName, primaryCategory, etc.)
- `server/actions/questions-management.ts` (line 73): Cannot find name 'answer_id'. Did you mean 'answerId'?

**Fix Strategy:**
1. Add proper type definitions for Response objects
2. Fix variable name typos
3. Ensure variables are declared before use

---

### Category 8: Component Type Issues (TS2559, TS2322)
**Count:** 25 errors (6% of all errors)
**Priority:** MEDIUM

**Affected Files:**
- `components/questions/AutoAnswerMonitoring.tsx` (23 errors - lines 27-91)
  - Issue: Card/CardHeader/CardTitle components have no type definitions
- `components/questions/AutoAnswerTesting.tsx` (1 error - line 2)
  - Cannot find module '@components/ui'

**Fix Strategy:**
1. Fix import paths (@components/ui should be @/components/ui)
2. Ensure Card components export proper prop types
3. May need to check if components exist or create them

---

### Category 9: Miscellaneous Specific Issues
**Count:** ~30 errors (7% of all errors)
**Priority:** LOW-MEDIUM

**Examples:**

#### 9a. Calendar onSelect Type Mismatch (TS2430)
- `components/ui/calendar.tsx` (line 6)
- Complex type incompatibility in Calendar component

#### 9b. Import Path Extensions (TS5097)
- `components/ui/index.ts` (line 1)
- Import path can only end with '.ts' extension when 'allowImportingTsExtensions' is enabled

#### 9c. Global Type Declaration Conflicts (TS2687, TS2717)
- `components/analytics/google-analytics.tsx` (lines 71, 71)
- `hooks/use-performance-monitor.ts` (line 253)
- All declarations of 'gtag' must have identical modifiers

#### 9d. ZodError Import Type Issue (TS1361)
- `middleware/validate-request.ts` (line 82)
- 'ZodError' cannot be used as a value because it was imported using 'import type'

#### 9e. Loader2 Missing (TS2304)
- `components/sync/sync-progress-modal.tsx` (line 129)
- Cannot find name 'Loader2' (likely missing import from lucide-react)

#### 9f. UUID Type Mismatch (TS2322)
- `server/actions/gmb-sync-v2.ts` (line 82)
- Type 'string' is not assignable to type UUID template literal

#### 9g. Duplicate Property (TS2783)
- `server/actions/gmb-sync-v2.ts` (line 521)
- 'success' is specified more than once

#### 9h. useEffect Return Type (TS2345)
- `hooks/use-auto-save.ts` (line 90)
- useEffect callback returning wrong type

#### 9i. Generic Type Readonly Issue (TS2862)
- `lib/security/input-sanitizer.ts` (line 229)
- Type 'T' is generic and can only be indexed for reading

#### 9j. Comparison Type Mismatches (TS2367)
- `hooks/use-questions-cache.ts` (line 125): number vs string
- `lib/utils/get-base-url.ts` (line 21): 'development'/'test' vs 'production'
- `lib/services/ml-questions-service.ts` (line 148): category types mismatch

#### 9k. Type vs Value Confusion (TS2749)
- `components/reviews/auto-reply-settings.tsx` (line 163)
- 'AutoReplySettings' refers to a value, but is being used as a type

#### 9l. Property Does Not Exist on Type (TS2339)
- `lib/services/ai-content-generation-service.ts` (lines 374, 375)
- Property 'type' does not exist on possibly undefined object

#### 9m. Wrong Method Name (TS2551)
- `lib/services/ml-sentiment-service.ts` (line 95)
- Property 'getBasicSentiment' does not exist. Did you mean 'getTopicSentiment'?

#### 9n. Identifier Name Conflicts (TS2552)
- `components/settings/gmb-notifications-setup.tsx` (line 423)
- Cannot find name 'GMBNotificationsSetup'. Did you mean 'GmbNotificationsSetup'?

---

## Priority-Based Fix Plan

### Phase 1: Critical Blockers (MUST FIX FIRST)
**Estimated Time: 30-60 minutes**

1. **Create missing AI types** (Category 2 - 13 errors)
   - Create/update `lib/types/ai.ts` with all missing type exports
   - This blocks 7 files from compiling

2. **Fix function signature errors** (Category 5 - 13 errors)
   - Fix `app/api/gmb/notifications/setup/route.ts`
   - All errors in one file

### Phase 2: Priority 1 - Authentication & Security (2-3 hours)
**Files: 7 | Errors: ~20**

1. `lib/services/auth-service.ts` (10 errors)
2. `lib/hooks/use-supabase.ts` (3 errors)
3. `lib/utils/auth-helpers.ts` (1 error)
4. `app/[locale]/auth/login/page.tsx` (3 errors)
5. `app/[locale]/auth/signup/page.tsx` (2 errors)
6. `app/[locale]/auth/reset/page.tsx` (1 error)
7. `app/[locale]/auth/update-password/page.tsx` (1 error)

### Phase 3: Priority 2 - GMB Sync (1-2 hours)
**Files: 5 | Errors: ~10**

1. `lib/gmb/helpers.ts` (1 error - line 100)
2. `server/actions/gmb-sync-v2.ts` (2 errors - lines 82, 521)
3. `server/actions/gmb-sync.ts` (1 error - line 68)
4. `server/actions/auto-reply.ts` (1 error - line 449)
5. `server/actions/questions-management.ts` (1 error - line 73)

### Phase 4: Priority 3 - API Routes (2-3 hours)
**Files: 10 | Errors: ~30**

1. `app/api/webhooks/gmb-notifications/route.ts` (2 errors)
2. `app/api/notifications/route.ts` (2 errors)
3. `app/api/reviews/analyze-sentiment/route.ts` (2 errors)
4. `app/api/features/profile/[locationId]/route.ts` (11 errors)
5. `app/api/gmb/questions/route.ts` (4 errors)
6. `app/api/ai/automation-status/route.ts` (1 error)
7. `app/api/ai/chat/route.ts` (2 errors)
8. `app/api/ai/insights/route.ts` (4 errors)
9. `middleware/validate-request.ts` (1 error)
10. `lib/ai/provider.ts` (2 errors)

### Phase 5: Priority 4 - Components (4-6 hours)
**Files: 80+ | Errors: 300+**

**Subphase 5a: Dashboard Components (1 hour)**
- Fix null checks for supabase
- Fix AI component type imports
- ~30 errors

**Subphase 5b: Analytics Components (1.5 hours)**
- Fix null checks
- Fix locationIds prop issue
- Fix gtag declaration conflicts
- ~60 errors

**Subphase 5c: Settings Components (1 hour)**
- Fix null checks
- Fix undeclared variables in gmb-settings
- ~40 errors

**Subphase 5d: Locations & Features Components (1 hour)**
- Fix null checks
- Fix Response type issues
- ~30 errors

**Subphase 5e: Media Components (30 minutes)**
- Add type annotations for all implicit any
- ~20 errors

**Subphase 5f: Questions/Reviews Components (1 hour)**
- Fix Card component type issues
- Fix import paths
- Fix Response type issues
- ~40 errors

**Subphase 5g: UI Components (30 minutes)**
- Fix Calendar type issues
- Fix import path extensions
- Fix Loader2 missing import
- ~5 errors

**Subphase 5h: Hooks & Services (1.5 hours)**
- Fix null checks in hooks
- Fix useEffect return type
- Fix service type issues
- ~50 errors

**Subphase 5i: Contexts & Misc (30 minutes)**
- Fix remaining errors
- ~20 errors

---

## Common Fix Patterns

### Pattern 1: Supabase Null Check (used 200+ times)

```typescript
// BEFORE:
export default async function Component() {
  const supabase = await createClient();
  const { data } = await supabase.from('table').select();
  // ...
}

// AFTER:
export default async function Component() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  const { data } = await supabase.from('table').select();
  // ...
}
```

### Pattern 2: Component Prop Types

```typescript
// BEFORE:
const Component = ({ items, onDelete }) => {
  return items.map(item => <div onClick={() => onDelete(item.id)} />);
};

// AFTER:
interface ComponentProps {
  items: Item[];
  onDelete: (id: string) => void;
}

const Component = ({ items, onDelete }: ComponentProps) => {
  return items.map((item: Item) => <div onClick={() => onDelete(item.id)} />);
};
```

### Pattern 3: Null/Undefined Type Narrowing

```typescript
// BEFORE:
const value: string | null = getValue();
const result: string = value; // ERROR

// SOLUTION 1: Null coalescing
const result: string = value ?? 'default';

// SOLUTION 2: Null check
if (!value) throw new Error('Value required');
const result: string = value;

// SOLUTION 3: Type assertion (only if guaranteed)
const result: string = value!;
```

### Pattern 4: Response Type Definitions

```typescript
// BEFORE:
const response = await fetch('/api/endpoint');
const data = await response.json();
if (data.error) { ... } // ERROR: Property 'error' does not exist

// AFTER:
interface ApiResponse {
  error?: string;
  data?: any;
  summary?: any;
}

const response = await fetch('/api/endpoint');
const data: ApiResponse = await response.json();
if (data.error) { ... } // OK
```

---

## Estimated Total Time

- **Phase 1 (Critical):** 30-60 minutes
- **Phase 2 (Auth):** 2-3 hours
- **Phase 3 (GMB):** 1-2 hours
- **Phase 4 (API):** 2-3 hours
- **Phase 5 (Components):** 4-6 hours
- **Testing & Validation:** 1-2 hours

**Total: 10-17 hours**

---

## Success Criteria

✅ All 427 TypeScript errors resolved
✅ `npx tsc --noEmit` passes with 0 errors
✅ `npm test` passes all tests
✅ `npm run build` completes successfully
✅ No runtime errors introduced
✅ All existing functionality preserved

---

## Next Steps

1. Start with Phase 1 (Critical Blockers)
2. Proceed through priorities 1-4 systematically
3. Commit after each file or small group of related files
4. Test frequently to catch any introduced issues
5. Update this document with progress
