# 🔧 Issues To Fix

> Generated: December 2, 2025
> Total Issues: ~473

---

## � Priority 0: Critical Issues

### 1. Typo in Filename (Route Won't Work!)

| File                                    | Issue                                         | Status |
| --------------------------------------- | --------------------------------------------- | ------ |
| `app/api/gmb/questions/answer/routs.ts` | "routs" instead of "route" - FIXED → route.ts | ✅     |

### 2. XSS Risk - dangerouslySetInnerHTML

| File                             | Status |
| -------------------------------- | ------ |
| `components/seo/landing-seo.tsx` | ⏳     |

### 3. No Unit Tests

| Issue                                                  | Status |
| ------------------------------------------------------ | ------ |
| No `*.test.ts` files in project (outside node_modules) | ⏳     |

---

## � Priority 1: `any` Types (Critical)

### Components (86 instances)

| File                                                      | Count | Status |
| --------------------------------------------------------- | ----- | ------ |
| `components/insights/business-insights.tsx`               | 7     | ⏳     |
| `components/locations/edit-location-dialog.tsx`           | 7     | ⏳     |
| `components/features/bulk-update-dialog.tsx`              | 6     | ⏳     |
| `components/locations/location-media-section.tsx`         | 4     | ⏳     |
| `components/locations/location-qa-section.tsx`            | 4     | ⏳     |
| `components/analytics/response-time-chart.tsx`            | 3     | ⏳     |
| `components/features/validation-panel.tsx`                | 3     | ⏳     |
| `components/locations/business-info-editor.tsx`           | 3     | ⏳     |
| `components/locations/location-detail-header.tsx`         | 3     | ⏳     |
| `components/locations/location-reviews-section.tsx`       | 3     | ⏳     |
| `components/locations/locations-map-tab.tsx`              | 3     | ⏳     |
| `components/locations/search-google-locations-dialog.tsx` | 3     | ⏳     |
| `components/media/MediaGalleryClient.tsx`                 | 3     | ⏳     |
| `components/settings/security-review-panel.tsx`           | 3     | ⏳     |

### Lib (48 instances)

| File                                   | Count | Status |
| -------------------------------------- | ----- | ------ |
| `lib/i18n/formatting.ts`               | 6     | ⏳     |
| `lib/utils/location-coordinates.ts`    | 5     | ⏳     |
| `lib/posts/posts-crud.ts`              | 4     | ⏳     |
| `lib/services/ai-review-service.ts`    | 4     | ⏳     |
| `lib/utils/secure-search.ts`           | 4     | ⏳     |
| `lib/security/input-sanitizer.ts`      | 3     | ⏳     |
| `lib/security/webhook-verification.ts` | 3     | ⏳     |
| `lib/services/ml-sentiment-service.ts` | 3     | ⏳     |
| `lib/utils/error-handling.ts`          | 3     | ⏳     |
| `lib/api/auth-middleware.ts`           | 2     | ⏳     |

### API Routes (~50 instances)

| File                                                         | Count | Status |
| ------------------------------------------------------------ | ----- | ------ |
| `app/api/locations/optimized/route.ts`                       | 6     | ⏳     |
| `app/api/features/profile/[locationId]/route.ts`             | 5     | ⏳     |
| `app/api/locations/[id]/route.ts`                            | 5     | ⏳     |
| `app/[locale]/(dashboard)/analytics/AnalyticsComponents.tsx` | 5     | ⏳     |
| `app/api/ai/insights/route.ts`                               | 4     | ⏳     |
| `app/api/locations/[id]/cover/route.ts`                      | 4     | ⏳     |
| `app/api/locations/[id]/logo/route.ts`                       | 4     | ⏳     |
| `app/api/locations/export/route.ts`                          | 4     | ⏳     |
| `app/api/gmb/audit/route.ts`                                 | 3     | ⏳     |

### Hooks (5 instances)

| File                                     | Count | Status |
| ---------------------------------------- | ----- | ------ |
| `hooks/features/use-ai-chat-enhanced.ts` | 4     | ⏳     |
| `hooks/use-realtime.ts`                  | 1     | ⏳     |

---

## 🟠 Priority 2: Empty Catch Blocks (~30 instances)

| File                                         | Count | Status                              |
| -------------------------------------------- | ----- | ----------------------------------- |
| `app/api/diagnostics/gmb-api/route.ts`       | 7     | ✅ Safe JSON fallback               |
| `app/api/diagnostics/ai-health/route.ts`     | 4     | ✅ Safe JSON fallback               |
| `server/actions/questions-management.ts`     | 4     | ✅ Safe JSON fallback               |
| `server/actions/reviews-management.ts`       | 4     | ✅ Safe JSON fallback               |
| `server/actions/gmb-sync.ts`                 | 3     | ✅ FIXED - Added error logging      |
| `components/dashboard/BusinessHeader.tsx`    | 3     | ✅ Safe - intentional silent for UI |
| `components/locations/locations-map-tab.tsx` | 3     | ✅ Properly handled                 |
| `server/actions/posts-management.ts`         | 2     | ✅ Properly handled with logger     |

---

## 🟡 Priority 3: Console Statements in Production (~41 instances)

| File                                               | Count | Status                              |
| -------------------------------------------------- | ----- | ----------------------------------- |
| `app/api/features/profile/[locationId]/route.ts`   | 7     | ✅ Safe - dev only (NODE_ENV check) |
| `app/[locale]/(dashboard)/locations/[id]/page.tsx` | 3     | ✅ FIXED - removed                  |
| `app/api/reviews/ai-response/route.ts`             | 3     | ✅ FIXED → reviewsLogger            |
| `app/[locale]/(dashboard)/locations/page.tsx`      | 2     | ✅ FIXED - removed                  |
| `app/api/gmb/attributes/route.ts`                  | 2     | ✅ FIXED → gmbLogger                |
| `app/api/locations/[id]/activity/route.ts`         | 2     | ✅ FIXED → apiLogger                |
| `app/api/reviews/pending/route.ts`                 | 2     | ✅ FIXED → reviewsLogger            |
| `app/api/reviews/sentiment/route.ts`               | 2     | ✅ FIXED → reviewsLogger            |

---

## 🟢 Priority 4: ESLint Disables (~12 instances)

| File                                                  | Count | Status                                |
| ----------------------------------------------------- | ----- | ------------------------------------- |
| `components/locations/locations-map-tab.tsx`          | 4     | ✅ Intentional - avoid infinite loops |
| `hooks/use-realtime.ts`                               | 3     | ✅ Intentional - Supabase types       |
| `hooks/use-background-sync.ts`                        | 3     | ✅ Intentional - performance          |
| `components/ai/ai-assistant.tsx`                      | 1     | ✅ Intentional - run once on mount    |
| `components/locations/location-attributes-dialog.tsx` | 1     | ✅ Intentional - dialog open state    |

---

## 🔵 Priority 5: Throw Errors Without Handling (68 instances)

| File                                             | Count | Status |
| ------------------------------------------------ | ----- | ------ |
| `app/api/diagnostics/oauth-advanced/route.ts`    | 6     | ⏳     |
| `app/[locale]/(dashboard)/locations/actions.ts`  | 5     | ⏳     |
| `app/api/ai/chat/stream/route.ts`                | 4     | ⏳     |
| `app/api/ai/generate/route.ts`                   | 4     | ⏳     |
| `app/[locale]/(dashboard)/features/page.tsx`     | 3     | ⏳     |
| `app/[locale]/(dashboard)/locations/page.tsx`    | 3     | ⏳     |
| `app/api/webhooks/gmb-notifications/route.ts`    | 3     | ⏳     |
| `app/api/ai/chat/enhanced/route.ts`              | 3     | ⏳     |
| `app/api/features/profile/[locationId]/route.ts` | 3     | ⏳     |

---

## 🟣 Priority 6: Environment Variables Without Validation (~50 instances)

| File                                             | Count | Status |
| ------------------------------------------------ | ----- | ------ |
| `lib/ai/fallback-provider.ts`                    | 16    | ⏳     |
| `app/api/features/profile/[locationId]/route.ts` | 10    | ⏳     |
| `lib/ai/provider.ts`                             | 10    | ⏳     |
| `app/api/ai/chat/enhanced/route.ts`              | 10    | ⏳     |
| `app/api/diagnostics/ai-health/route.ts`         | 8     | ⏳     |
| `app/api/dashboard/overview/route.ts`            | 7     | ⏳     |

---

## ⚪ Priority 7: Unsafe Type Casting `as unknown as`

| File                                      | Count | Status |
| ----------------------------------------- | ----- | ------ |
| `server/actions/reviews.ts`               | 2     | ⏳     |
| `app/[locale]/home/page.tsx`              | 1     | ⏳     |
| `app/api/ai/actions/batch-reply/route.ts` | 1     | ⏳     |
| `hooks/use-products.ts`                   | 1     | ⏳     |
| `hooks/use-services.ts`                   | 1     | ⏳     |
| `lib/security/tenant-isolation.ts`        | 1     | ⏳     |

---

## 🔘 Priority 8: Untyped useState([]) (54 instances)

| File                                                       | Count | Status |
| ---------------------------------------------------------- | ----- | ------ |
| `components/locations/edit-location-dialog.tsx`            | 4     | ⏳     |
| `components/ai-command-center/ai/ai-provider-selector.tsx` | 2     | ⏳     |
| `components/analytics/analytics-filters.tsx`               | 2     | ⏳     |
| `components/analytics/custom-report-builder.tsx`           | 2     | ⏳     |
| `components/analytics/analytics-dashboard.tsx`             | 1     | ⏳     |
| `components/analytics/location-performance.tsx`            | 1     | ⏳     |
| `+ 48 more files...`                                       | -     | ⏳     |

---

## ⬜ Priority 9: TODO/FIXME Comments (15 instances)

| File                                             | Count | Status |
| ------------------------------------------------ | ----- | ------ |
| `components/home/home-page-content.tsx`          | 2     | ⏳     |
| `components/settings/data-management.tsx`        | 2     | ⏳     |
| `lib/gmb/pubsub-helpers.ts`                      | 2     | ⏳     |
| `components/analytics/custom-report-builder.tsx` | 1     | ⏳     |
| `components/reviews/ReviewAISettings.tsx`        | 1     | ⏳     |
| `components/reviews/bulk-action-bar.tsx`         | 1     | ⏳     |
| `server/actions/questions-management.ts`         | 1     | ⏳     |
| `lib/i18n/stub.ts`                               | 1     | ⏳     |
| `lib/services/ml-questions-service.ts`           | 1     | ⏳     |
| `app/api/ai/actions/save-replies/route.ts`       | 1     | ⏳     |
| `app/api/locations/[id]/update/route.ts`         | 1     | ⏳     |
| `app/api/newsletter/route.ts`                    | 1     | ⏳     |

---

## ⬛ Priority 10: Cleanup Tasks

### Unused Files

| File                                      | Issue                 | Status |
| ----------------------------------------- | --------------------- | ------ |
| `.logger-migration-backup/`               | Empty folder - DELETE | ⏳     |
| `components/home/home-error-boundary.tsx` | 123 lines - NOT USED  | ⏳     |

### Architecture Issues

| Issue                | Location                     | Status |
| -------------------- | ---------------------------- | ------ |
| 4 layers of wrappers | `home/` components           | ⏳     |
| Name conflict        | `HomePageContent` in 2 files | ⏳     |

---

## 📊 Summary

| Priority | Category                       | Count                                |
| -------- | ------------------------------ | ------------------------------------ |
| 🚨 P0    | Critical (typo, XSS, no tests) | 3 → ✅ 1 fixed                       |
| 🔴 P1    | `any` types                    | ~246 → **208 remaining (15% fixed)** |
| 🟠 P2    | Empty catches                  | ~30 → ✅ all reviewed                |
| 🟡 P3    | Console statements             | ~41 → ✅ all reviewed                |
| 🟢 P4    | ESLint disables                | ~12 → ✅ all intentional             |
| 🔵 P5    | Throw without handling         | ~68                                  |
| 🟣 P6    | Env vars without validation    | ~50                                  |
| ⚪ P7    | Unsafe type casting            | 7                                    |
| 🔘 P8    | Untyped useState               | 54                                   |
| ⬜ P9    | TODOs                          | 15                                   |
| ⬛ P10   | Cleanup tasks                  | 4                                    |
|          | **TOTAL**                      | **~473**                             |

---

## ✅ Recently Fixed (Dec 2, 2025)

| Issue                                           | Files                     | Status         |
| ----------------------------------------------- | ------------------------- | -------------- |
| `last_synced_at` → `last_sync` for gmb_accounts | 6 files                   | ✅             |
| Infinite realtime subscription loop             | `use-realtime.ts`         | ✅             |
| OAuth callback error handling                   | `oauth-callback/route.ts` | ✅             |
| Rate limiting unified to Redis                  | Multiple routes           | ✅             |
| Typo `routs.ts` → `route.ts`                    | `gmb/questions/answer/`   | ✅             |
| `any` type in Q&A answer route                  | `gmb/questions/answer/`   | ✅             |
| Empty catch in concurrency limiter              | `gmb-sync.ts`             | ✅             |
| Console → gmbLogger + fix any types             | `gmb/attributes/route.ts` | ✅             |
| Console → apiLogger + fix any types             | `locations/[id]/activity` | ✅             |
| Console → reviewsLogger + fix any types         | 3 review API routes       | ✅             |
| Console removed from location pages             | 2 location pages          | ✅             |
| ESLint disables reviewed                        | 5 files                   | ✅ Intentional |
| **`any` types cleanup**                         | **38 instances fixed**    | ✅             |

---

## 🎯 Recommended Fix Order

1. 🚨 **Critical** - Fix typo `routs.ts` → `route.ts`, review XSS
2. 🔴 **`any` types** - Start with high-traffic components
3. 🟠 **Empty catches** - Add proper error logging
4. 🔵 **Throw handling** - Wrap in try-catch
5. 🟣 **Env validation** - Add zod schemas
6. 🟡 **Console statements** - Replace with logger
7. 🟢 **ESLint disables** - Fix root cause
8. ⚪ **Type casting** - Replace with proper types
9. 🔘 **Untyped useState** - Add generic types
10. ⬜ **TODOs** - Complete or remove
11. ⬛ **Cleanup** - Delete unused files

---

_Last updated: December 2, 2025_
