# 🟠 High Priority: Unused Imports and Variables

## Problem Summary

1070+ lint warnings, many are unused imports and variables. This increases bundle size and makes code harder to maintain.

## Severity: 🟠 High Priority

- **Impact**: Larger bundle, confusing code
- **Effort**: 2-3 hours
- **Risk**: Medium - affects performance

## Affected Files (Examples)

```
app/[locale]/(dashboard)/dashboard/quick-action-buttons.tsx
  - 'cacheUtils' defined but never used
  - 'router' assigned but never used
  - 'setLoading' assigned but never used

app/[locale]/(dashboard)/not-found.tsx
  - 'Home' defined but never used

app/[locale]/(dashboard)/settings/auto-pilot/page.tsx
  - 'Clock' defined but never used
  - 'TrendingUp' defined but never used

app/[locale]/(marketing)/page.tsx
  - 'Video' defined but never used
  - 'Activity' defined but never used
  - 'MessageSquare' defined but never used
  - 'MapPin' defined but never used
  - 'Star' defined but never used
  - 'BarChart3' defined but never used
  - 'FeatureCard' defined but never used

app/[locale]/auth/signout/route.ts
  - 'request' defined but never used

app/[locale]/layout.tsx
  - 'direction' assigned but never used
```

## Step-by-Step Fix

### Step 1: Run lint to get full list

```bash
npm run lint 2>&1 | grep "is defined but never used\|is assigned a value but never used"
```

### Step 2: For each file, either:

1. **Remove the import/variable** if not needed
2. **Prefix with underscore** if intentionally unused: `_unusedVar`
3. **Use the variable** if it should be used

### Step 3: Fix pattern

```typescript
// Before
import { Video, Activity, Star } from "lucide-react"; // ❌ Video, Activity unused

// After
import { Star } from "lucide-react"; // ✅ Only import what's used
```

### Step 4: For function parameters

```typescript
// Before
export async function GET(request: Request) { // ❌ request unused

// After
export async function GET(_request: Request) { // ✅ Prefix with underscore
```

## Acceptance Criteria

- [ ] No "defined but never used" warnings
- [ ] No "assigned but never used" warnings
- [ ] Bundle size reduced
- [ ] `npm run lint` passes with fewer warnings

## Verification

```bash
npm run lint 2>&1 | grep -c "never used"
# Should be 0 or significantly reduced
```

## Status: ⏳ Pending
