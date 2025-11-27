# 🔴 CRITICAL FIX: Add Zod Validation to Server Actions

## 📋 Problem Summary

**Issue ID:** CRITICAL-003
**Severity:** 🔴 CRITICAL - DATA INTEGRITY & SECURITY
**Priority:** P0 (Immediate)
**Estimated Time:** 8 hours
**Domain:** Validation / Security

---

## 🎯 What You Need to Fix

Multiple server actions accept user input **without Zod schema validation**, allowing invalid or malicious data to reach the database.

**Files Affected:**
1. `server/actions/auto-reply.ts` - Lines 26-28, 134-135
2. `server/actions/gmb-settings.ts` - Lines 7-9, 60-61
3. `server/actions/onboarding.ts` - No validation at all
4. `server/actions/gmb-account.ts` - Line 69

---

## 📁 Files to Modify

### Critical Priority:
- `server/actions/auto-reply.ts`
- `server/actions/gmb-settings.ts`
- `server/actions/onboarding.ts`
- `server/actions/gmb-account.ts`

### Supporting Files:
- `lib/validations/auto-reply.ts` (create new)
- `lib/validations/gmb-settings.ts` (create new)
- `lib/validations/onboarding.ts` (create new)

---

## 🐛 Current Problem Code

### Problem 1: auto-reply.ts (Lines 26-28)

```typescript
// ❌ NO VALIDATION!
export async function saveAutoReplySettings(
  settings: AutoReplySettings  // Accepted blindly
) {
  const supabase = await createClient();

  // Direct insert without validation
  const { error } = await supabase
    .from('auto_reply_settings')
    .upsert(settings);  // ❌ DANGEROUS!
}
```

### Problem 2: gmb-settings.ts (Lines 7-9)

```typescript
// ❌ NO VALIDATION!
export async function updateSyncSchedule(
  accountId: string,  // Not validated as UUID
  schedule: string    // Not validated against enum
) {
  // Direct database update
}
```

### Problem 3: onboarding.ts

```typescript
// ❌ NO VALIDATION ANYWHERE!
export async function completeOnboarding(data: any) {
  // Accepts literally anything
}
```

---

## ✅ Required Fix

### Step 1: Create Validation Schemas

#### Create `lib/validations/auto-reply.ts`:

```typescript
import { z } from 'zod';

// Auto-reply tone enum
export const AutoReplyToneSchema = z.enum([
  'professional',
  'friendly',
  'apologetic',
  'marketing',
  'casual'
]);

// Auto-reply settings schema
export const AutoReplySettingsSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  location_id: z.string().uuid().nullable().optional(),

  // Enable/disable flags
  enabled: z.boolean(),
  auto_reply_1_star: z.boolean().default(false),
  auto_reply_2_star: z.boolean().default(false),
  auto_reply_3_star: z.boolean().default(false),
  auto_reply_4_star: z.boolean().default(true),
  auto_reply_5_star: z.boolean().default(true),

  // AI settings
  use_ai: z.boolean().default(true),
  ai_tone: AutoReplyToneSchema.default('professional'),

  // Response settings
  response_style: z.string().max(50).optional(),
  response_delay_minutes: z.number().int().min(0).max(1440).default(5),
  require_approval: z.boolean().default(true),

  // Custom templates (optional)
  template_1_star: z.string().max(1000).optional(),
  template_2_star: z.string().max(1000).optional(),
  template_3_star: z.string().max(1000).optional(),
  template_4_star: z.string().max(1000).optional(),
  template_5_star: z.string().max(1000).optional(),

  // Business context
  business_name: z.string().max(255).optional(),
  business_type: z.string().max(100).optional(),

  // Timestamps
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
}).strict(); // Reject unknown keys

// Type inference
export type AutoReplySettings = z.infer<typeof AutoReplySettingsSchema>;

// Partial update schema (for updates)
export const AutoReplySettingsUpdateSchema = AutoReplySettingsSchema.partial().extend({
  id: z.string().uuid(), // ID required for updates
});
```

#### Create `lib/validations/gmb-settings.ts`:

```typescript
import { z } from 'zod';

export const SyncScheduleSchema = z.enum([
  'manual',
  'hourly',
  'daily',
  'weekly',
  'realtime'
]);

export const UpdateSyncScheduleSchema = z.object({
  accountId: z.string().uuid({
    message: 'Invalid account ID format'
  }),
  schedule: SyncScheduleSchema,
});

export type UpdateSyncScheduleInput = z.infer<typeof UpdateSyncScheduleSchema>;
```

#### Create `lib/validations/onboarding.ts`:

```typescript
import { z } from 'zod';

export const OnboardingDataSchema = z.object({
  user_id: z.string().uuid(),

  // Business information
  business_name: z.string().min(1).max(255),
  business_type: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),

  // Preferences
  preferred_language: z.enum(['en', 'ar']).default('en'),
  timezone: z.string().max(50).optional(),

  // Features to enable
  enable_auto_reply: z.boolean().default(false),
  enable_auto_answer: z.boolean().default(false),

  // Onboarding progress
  completed_steps: z.array(z.string()).default([]),
  onboarding_completed: z.boolean().default(false),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
}).strict();

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
```

---

### Step 2: Update Server Actions

#### Fix `server/actions/auto-reply.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { AutoReplySettingsSchema, AutoReplySettingsUpdateSchema } from '@/lib/validations/auto-reply';
import { z } from 'zod';

/**
 * Save auto-reply settings with validation
 */
export async function saveAutoReplySettings(
  settings: unknown  // Accept unknown, validate inside
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. ✅ VALIDATE with Zod
    const validated = AutoReplySettingsSchema.parse({
      ...settings,
      user_id: user.id, // Ensure user_id matches authenticated user
    });

    // 3. Database operation with validated data
    const { data, error } = await supabase
      .from('auto_reply_settings')
      .upsert(validated)
      .select()
      .single();

    if (error) {
      console.error('[Auto Reply] Save error:', error);
      return { success: false, error: 'Failed to save settings' };
    }

    return { success: true, data };

  } catch (error) {
    // 4. Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('[Auto Reply] Validation error:', error.errors);
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    console.error('[Auto Reply] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update auto-reply settings (partial update)
 */
export async function updateAutoReplySettings(
  settingsId: string,
  updates: unknown
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // ✅ Validate partial update
    const validated = AutoReplySettingsUpdateSchema.parse({
      ...updates,
      id: settingsId,
      user_id: user.id,
    });

    const { data, error } = await supabase
      .from('auto_reply_settings')
      .update(validated)
      .eq('id', settingsId)
      .eq('user_id', user.id) // Security: ensure user owns this setting
      .select()
      .single();

    if (error) {
      return { success: false, error: 'Failed to update settings' };
    }

    return { success: true, data };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

#### Fix `server/actions/gmb-settings.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { UpdateSyncScheduleSchema } from '@/lib/validations/gmb-settings';
import { z } from 'zod';

export async function updateSyncSchedule(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // ✅ Validate input
    const { accountId, schedule } = UpdateSyncScheduleSchema.parse(input);

    // Verify user owns this account
    const { data: account } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      return { success: false, error: 'Account not found or access denied' };
    }

    // Update schedule
    const { error } = await supabase
      .from('gmb_accounts')
      .update({ sync_schedule: schedule, updated_at: new Date().toISOString() })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: 'Failed to update schedule' };
    }

    return { success: true };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid input: ${error.errors[0].message}`
      };
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

#### Fix `server/actions/onboarding.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { OnboardingDataSchema } from '@/lib/validations/onboarding';
import { z } from 'zod';

export async function completeOnboarding(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // ✅ Validate onboarding data
    const validated = OnboardingDataSchema.parse({
      ...data,
      user_id: user.id,
      onboarding_completed: true,
    });

    // Update profile with onboarding data
    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: validated.business_name,
        business_type: validated.business_type,
        industry: validated.industry,
        preferred_language: validated.preferred_language,
        timezone: validated.timezone,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: 'Failed to save onboarding data' };
    }

    return { success: true };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      };
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

---

## 🔍 Step-by-Step Implementation

### Phase 1: Create Validation Schemas (2 hours)
1. Create `lib/validations/` directory if not exists
2. Create all validation schema files
3. Test schemas in isolation

### Phase 2: Update Server Actions (4 hours)
1. Update `auto-reply.ts`
2. Update `gmb-settings.ts`
3. Update `onboarding.ts`
4. Update `gmb-account.ts`

### Phase 3: Update Frontend Calls (1 hour)
Find and update all places that call these actions:
```bash
grep -r "saveAutoReplySettings\|updateSyncSchedule\|completeOnboarding" app/ components/
```

### Phase 4: Test (1 hour)
- Unit tests for schemas
- Integration tests for server actions
- Manual testing in dev environment

---

## ✅ Acceptance Criteria

- [ ] All validation schemas created in `lib/validations/`
- [ ] All server actions validate input with Zod
- [ ] Proper error messages for validation failures
- [ ] User ID always validated and matched to authenticated user
- [ ] UUIDs validated with `z.string().uuid()`
- [ ] Enums validated against allowed values
- [ ] String lengths limited (prevent DoS)
- [ ] Numbers have min/max bounds
- [ ] Unknown keys rejected with `.strict()`
- [ ] Tests pass: `npm run test`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Manual testing confirms validation works
- [ ] Error messages are user-friendly

---

## 🧪 Testing

### Unit Tests

Create `lib/validations/auto-reply.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import { AutoReplySettingsSchema } from './auto-reply';

describe('AutoReplySettingsSchema', () => {
  it('should accept valid settings', () => {
    const valid = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      enabled: true,
      auto_reply_5_star: true,
      use_ai: true,
      ai_tone: 'professional',
      response_delay_minutes: 5,
      require_approval: true,
    };

    expect(() => AutoReplySettingsSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid UUID', () => {
    const invalid = {
      user_id: 'not-a-uuid',
      enabled: true,
    };

    expect(() => AutoReplySettingsSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid tone', () => {
    const invalid = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      enabled: true,
      ai_tone: 'invalid-tone',
    };

    expect(() => AutoReplySettingsSchema.parse(invalid)).toThrow();
  });

  it('should reject delay > 1440 minutes', () => {
    const invalid = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      enabled: true,
      response_delay_minutes: 2000, // > 24 hours
    };

    expect(() => AutoReplySettingsSchema.parse(invalid)).toThrow();
  });
});
```

---

## 📚 Reference

- [Zod Documentation](https://zod.dev/)
- [Server Actions Security](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security)

---

**Status:** 🔴 NOT STARTED
**Estimated Time:** 8 hours
**Priority:** P0 - CRITICAL

---

Validate everything. Trust nothing. 🛡️
