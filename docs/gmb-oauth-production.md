## GMB OAuth Production Setup (Next.js + Supabase)

This document explains, step-by-step, how to configure custom OAuth for connecting Google My Business in production, using the same Google OAuth client used for Supabase Auth login, ensuring no redirect_uri_mismatch occurs.

### 1) Choose Canonical Production Domain
- Choose only one domain as your unified reference: recommended `https://nnh.ae` without `www`.
- Maintain consistency: all values in environment and Google Console must match this domain exactly (including protocol and www or not).

### 2) Environment Variables (Secrets) Setup in Production
Configure the following values in the platform hosting your Next.js app (production environment):

- NEXT_PUBLIC_BASE_URL = `https://nnh.ae`
- GOOGLE_CLIENT_ID = `<copy from Google Console>`
- GOOGLE_CLIENT_SECRET = `<copy from Google Console>`
- GOOGLE_REDIRECT_URI = `https://nnh.ae/api/gmb/oauth-callback`

Important notes:
- GOOGLE_REDIRECT_URI is mandatory here because it's used in two places:
  - When creating the authorization URL in `app/api/gmb/create-auth-url/route.ts`.
  - And when exchanging code for tokens in `app/api/gmb/oauth-callback/route.ts`.
- If GOOGLE_REDIRECT_URI is not set, the code relies on NEXT_PUBLIC_BASE_URL to build the value, and any inconsistency will cause a redirect_uri_mismatch error.

### 3) Google Cloud Console (OAuth 2.0 Client) Configuration
Go to: Google Cloud Console → APIs & Services → Credentials → OAuth Client (the same client identified in GOOGLE_CLIENT_ID)

- Authorized JavaScript origins:
  - Add: `https://nnh.ae`

- Authorized redirect URIs: Make sure all these paths exist (exactly):
  - For Supabase login: `https://nnh.ae/auth/callback`
  - For custom GMB flow: `https://nnh.ae/api/gmb/oauth-callback`
  - Optionally (as needed): Internal Supabase addresses that appear in your screenshots, but maintain accuracy and avoid unnecessary duplication.

Precision tips:
- Avoid mixing `www.` with non-www unnecessarily. If you choose `https://nnh.ae`, stick with it.
- Don't add extra `/` at the end of paths.

### 4) Supabase Setup (For Reference Only)
Your `supabase/config.toml` file is configured for Google login via `https://www.nnh.ae/auth/callback`. If you adopt `https://nnh.ae` as standard:

- In Supabase Auth Dashboard → URL Configuration:
  - Site URL: `https://nnh.ae`
  - Redirect URLs: Include at least: `https://nnh.ae/auth/callback`

Note: Supabase setup here relates to user login to Supabase Auth, not the custom GMB flow. The GMB flow relies on the `api/gmb/oauth-callback` path within the Next.js app itself.

### 5) Verification After Configuration
After saving settings, run this scenario in production:
1. Log in to the platform (Supabase Auth) via the official domain `https://nnh.ae`.
2. From accounts page: `https://nnh.ae/accounts` click "Connect Account".
3. You'll be redirected to Google; monitor the `redirect_uri` in the address bar (or in server logs). It should be:
   - `https://nnh.ae/api/gmb/oauth-callback`
4. Complete authorization. When returning, a record should be created or updated in the `gmb_accounts` table and `refresh_token` should be populated.

### 6) Common Troubleshooting
- redirect_uri_mismatch:
  - Verify that GOOGLE_REDIRECT_URI exactly equals one of the Authorized redirect URIs in Google Console.
  - Verify that NEXT_PUBLIC_BASE_URL and GOOGLE_REDIRECT_URI use the same domain and protocol.
  - Remove unnecessary duplications or differences (like `www.` or trailing slash).

- Not receiving refresh_token:
  - Ensure the flow uses `access_type=offline` and `prompt=consent` (the code does this automatically).
  - Try removing previous authorization from https://myaccount.google.com/permissions then reconnect.

- State or record storage failure:
  - Review the `oauth_states` table and RLS policies. The code uses `createAdminClient()` for saving before authorization.
  - Review logs from the `POST /api/gmb/create-auth-url` route for any insert errors.

### 7) Quick Checklist (Production)
- [ ] `NEXT_PUBLIC_BASE_URL = https://nnh.ae`
- [ ] `GOOGLE_REDIRECT_URI = https://nnh.ae/api/gmb/oauth-callback`
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the same Google client
- [ ] Google Console contains:
  - [ ] `https://nnh.ae/auth/callback`
  - [ ] `https://nnh.ae/api/gmb/oauth-callback`
- [ ] Login works, and connection returns you to `/accounts#success=true`

### 8) Relevant Code References
- Building authorization URL (uses GOOGLE_REDIRECT_URI or NEXT_PUBLIC_BASE_URL):
  - `app/api/gmb/create-auth-url/route.ts`
- Exchanging code for tokens (same `redirect_uri`):
  - `app/api/gmb/oauth-callback/route.ts`

By following these steps precisely, the redirect_uri_mismatch error will be resolved and GMB connection will work properly in production.
