# NNH AI Studio - Deployment Guide

> **Version:** 0.9.0-beta
> **Last Updated:** November 2025

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration](#database-migration)
3. [Environment Variables](#environment-variables)
4. [Vercel Deployment](#vercel-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All tests pass: `npm run test`
- [ ] Build succeeds locally: `npm run build`
- [ ] Environment variables are configured in Vercel
- [ ] Database migrations are applied to production Supabase

---

## Database Migration

### Required Migrations

The following migrations must be applied to your Supabase database:

| Migration File                            | Description                             |
| ----------------------------------------- | --------------------------------------- |
| `20250101000000_init_full_schema.sql`     | Initial schema with all tables          |
| `20250101000001_add_worker_functions.sql` | Sync worker database functions          |
| `20250101000002_fix_sync_helpers.sql`     | Sync helper fixes                       |
| `20250102000000_harden_rls_policies.sql`  | **CRITICAL: RLS security hardening**    |
| `20251127000000_add_missing_tables.sql`   | Teams, brand profiles, autopilot tables |
| `20251128000001_create_gmb_services.sql`  | GMB services table                      |

### Apply Migrations

**Option 1: Using Supabase CLI (Recommended)**

```bash
# Login to Supabase (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all pending migrations
npx supabase db push
```

**Option 2: Using Migration Up Command**

```bash
# Apply migrations in order
npx supabase migration up
```

**Option 3: Manual Application via Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order (oldest to newest)
4. Verify RLS policies are enabled on all tables

### Verify RLS Policies

After migration, verify RLS is enabled:

```sql
-- Check RLS status on critical tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'gmb_accounts', 'gmb_locations', 'gmb_reviews',
  'gmb_questions', 'gmb_posts', 'gmb_media',
  'user_settings', 'activity_logs', 'sync_queue'
);
```

All tables should show `rowsecurity = true`.

---

## Environment Variables

### Required Variables (Production)

Configure these in Vercel → Settings → Environment Variables:

#### Supabase (Required)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Google/GMB OAuth (Required)

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/gmb/oauth-callback
```

#### AI Providers (At least one required)

```env
# OpenAI (Primary)
OPENAI_API_KEY=sk-...

# Google Gemini (Fallback)
GOOGLE_GEMINI_API_KEY=your-gemini-key

# Anthropic Claude (Optional)
ANTHROPIC_API_KEY=sk-ant-...

# Groq (Optional - Fast inference)
GROQ_API_KEY=gsk_...

# DeepSeek (Optional)
DEEPSEEK_API_KEY=your-deepseek-key
```

#### Security (Required)

```env
ENCRYPTION_KEY=32-character-hex-string
INTERNAL_API_SECRET=your-internal-secret
CRON_SECRET=your-cron-secret
```

#### Webhooks (Required for GMB notifications)

```env
GOOGLE_WEBHOOK_SECRET=your-webhook-secret
GOOGLE_WEBHOOK_VERIFY_TOKEN=your-verify-token
```

### Optional Variables

#### Email (SendGrid)

```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=NNH AI Studio
```

#### Monitoring

```env
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
MONITORING_WEBHOOK_URL=https://your-monitoring-endpoint
```

#### Google Maps

```env
GOOGLE_MAPS_API_KEY=your-maps-api-key
```

#### Application URLs

```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## Vercel Deployment

### Build Settings

| Setting          | Value           |
| ---------------- | --------------- |
| Framework Preset | Next.js         |
| Build Command    | `npm run build` |
| Output Directory | `.next`         |
| Install Command  | `npm install`   |
| Node.js Version  | 18.x or 20.x    |

### Deployment Steps

1. **Connect Repository**
   - Link your GitHub repository to Vercel
   - Select the `main` branch for production

2. **Configure Environment Variables**
   - Add all required variables from the list above
   - Use different values for Preview vs Production if needed

3. **Deploy**

   ```bash
   # Or trigger via Vercel CLI
   vercel --prod
   ```

4. **Configure Domain**
   - Add your custom domain in Vercel settings
   - Update `GOOGLE_REDIRECT_URI` to match

---

## Post-Deployment Verification

### Health Checks

After deployment, verify these endpoints:

```bash
# API Status
curl https://your-domain.com/api/status

# Auth Check (should return 401 if not authenticated)
curl https://your-domain.com/api/settings
```

### Functional Tests

1. **Authentication Flow**
   - [ ] Login with email/password works
   - [ ] OAuth with Google works
   - [ ] Session persists across page refreshes

2. **GMB Connection**
   - [ ] Can connect GMB account
   - [ ] Locations sync successfully
   - [ ] Reviews load correctly

3. **AI Features**
   - [ ] AI chat responds
   - [ ] Review reply generation works
   - [ ] Fallback providers activate if primary fails

4. **Security**
   - [ ] Non-authenticated users cannot access dashboard
   - [ ] RLS prevents cross-user data access
   - [ ] Rate limiting is active

---

## Rollback Procedure

If issues occur after deployment:

1. **Vercel Rollback**
   - Go to Vercel Dashboard → Deployments
   - Find the last working deployment
   - Click "..." → "Promote to Production"

2. **Database Rollback** (if migration caused issues)
   ```bash
   # Revert last migration
   npx supabase migration repair --status reverted MIGRATION_VERSION
   ```

---

## Support

For deployment issues, contact:

- **Email:** info@nnh.ae
- **Repository:** https://github.com/NN224/NNH-AI-Studio
