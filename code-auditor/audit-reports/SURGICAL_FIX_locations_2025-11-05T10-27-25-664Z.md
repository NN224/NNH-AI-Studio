# 🔧 SURGICAL FIX INSTRUCTIONS FOR LOCATIONS

**CRITICAL: Follow these instructions EXACTLY. Do not improvise or add creative solutions.**

## 📋 Overview

- Component: locations
- Total Issues: 0
- Files Affected: 29
- Estimated Time: 0 minutes
- Breakdown:
  - 🔴 Critical: 0
  - 🟡 High: 0
  - 🟢 Medium: 0
  - 🔵 Low: 0

---

## 🔴 CRITICAL FIXES

No critical issues found. ✅


## 🟡 HIGH PRIORITY FIXES

No high priority issues found. ✅


## 🟢 MEDIUM PRIORITY FIXES

No medium priority issues found. ✅


## 🔵 LOW PRIORITY FIXES

No low priority issues found. ✅


---

## ✅ Verification Checklist

After applying ALL fixes, verify:


1. **Compile Check:**
   ```bash
   npm run build
   ```
   ✅ Should complete with no TypeScript errors

2. **Linter Check:**
   ```bash
   npm run lint
   ```
   ✅ Should pass with no errors

3. **Type Check:**
   ```bash
   npm run type-check
   ```
   ✅ Should pass with no type errors

4. **Functional Tests:**
   - Test each fixed functionality manually
   - Verify expected behavior matches
   - Check browser console for errors

5. **Security Check:**
   - Test authentication on protected routes
   - Verify input sanitization
   - Check error messages don't expose sensitive data


---

## 🚨 CRITICAL RULES

1. **EXACT REPLACEMENTS ONLY**: Replace code EXACTLY as shown. Do not refactor, optimize, or "improve"
2. **LINE NUMBERS**: Use the exact line numbers provided
3. **PRESERVE FORMATTING**: Keep original indentation and spacing
4. **NO EXTRA CHANGES**: Do not modify code not explicitly mentioned
5. **TEST IMMEDIATELY**: Run the verification steps after each fix
6. **ONE FILE AT A TIME**: Complete all fixes in one file before moving to the next

---

## 📁 Files to Modify (in order)

1. `app/[locale]/(dashboard)/locations/optimized-page.tsx`
2. `app/[locale]/(dashboard)/locations/page.tsx`
3. `components/locations/LocationMapDashboard.tsx`
4. `components/locations/add-location-dialog.tsx`
5. `components/locations/edit-location-dialog.tsx`
6. `components/locations/enhanced-location-card.tsx`
7. `components/locations/gmb-connection-banner.tsx`
8. `components/locations/google-updated-info.tsx`
9. `components/locations/lazy-locations-components.tsx`
10. `components/locations/location-attributes-dialog.tsx`
11. `components/locations/location-card.tsx`
12. `components/locations/location-filters.tsx`
13. `components/locations/location-performance-widget.tsx`
14. `components/locations/location-profile-enhanced.tsx`
15. `components/locations/location-types.tsx`
16. `components/locations/locations-error-alert.tsx`
17. `components/locations/locations-error-boundary.tsx`
18. `components/locations/locations-filters.tsx`
19. `components/locations/locations-list.tsx`
20. `components/locations/locations-map-view.tsx`
21. `components/locations/locations-stats.tsx`
22. `components/locations/responsive-locations-layout.tsx`
23. `components/locations/search-google-locations-dialog.tsx`
24. `app/api/locations/[locationId]/cover/route.ts`
25. `app/api/locations/[locationId]/logo/route.ts`
26. `app/api/locations/bulk-publish/route.ts`
27. `app/api/locations/competitor-data/route.ts`
28. `app/api/locations/list-data/route.ts`
29. `app/api/locations/map-data/route.ts`

**Start with file #1 and work sequentially.**

---

## 🆘 If Something Doesn't Work

1. Verify you made the EXACT replacement shown
2. Check you didn't accidentally modify surrounding code
3. Ensure all imports are present
4. Run the verification steps
5. If still broken, revert and try again

---

**Ready? Start with Critical Fix #1 above.**
