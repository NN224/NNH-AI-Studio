# How to Apply gmb_services Migration

## Migration File

`20251128000001_create_gmb_services.sql`

## Purpose

Fix 404 errors in production by creating the missing `gmb_services` table.

## Impact

- **Fixes:** 4x 404 errors on `/rest/v1/gmb_services`
- **Enables:** AI post generation with services
- **Enables:** Services management in dashboard

## Files Affected

- `hooks/use-services.ts` (4 queries)
- `app/api/ai/generate-post/route.ts`
- `app/api/diagnostics/db/route.ts`
- `app/api/diagnostics/missing-tables/route.ts`

## How to Apply

### Option 1: Supabase Dashboard (Recommended for Production)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy content of `20251128000001_create_gmb_services.sql`
5. Paste and click **Run**
6. Verify: `SELECT count(*) FROM gmb_services;` → should return 0

### Option 2: Supabase CLI (Local Development)

```bash
# If Supabase CLI is configured
npx supabase db push

# Or apply specific migration
npx supabase db push --include-all
```

### Option 3: psql (Direct PostgreSQL)

```bash
psql postgresql://[CONNECTION_STRING] -f supabase/migrations/20251128000001_create_gmb_services.sql
```

## After Applying

1. **Update Documentation:**

   ```bash
   npm run db:update-docs
   ```

2. **Verify in Dashboard:**
   - Navigate to `/en/dashboard`
   - Check for services tab
   - No more 404 errors

3. **Test API:**
   ```bash
   curl https://nnh.ae/rest/v1/gmb_services?select=*
   # Should return [] instead of 404
   ```

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS gmb_services CASCADE;
```

## Notes

- Table includes RLS policies for security
- Indexes added for performance
- Triggers for auto-updating timestamps
- Compatible with existing GMB data structure
