# ✅ Pre-Publish Checklist - NNH AI Studio Platform

## 🔐 Environment Variables - Required

### Supabase
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (Admin operations)

### Google OAuth (GMB)
- ✅ `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- ✅ `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- ✅ `GOOGLE_REDIRECT_URI` - Should be: `https://www.nnh.ae/api/gmb/oauth-callback`

### YouTube OAuth (Optional but recommended)
- ⚠️ `YT_CLIENT_ID` - YouTube OAuth Client ID (falls back to GOOGLE_CLIENT_ID if not set)
- ⚠️ `YT_CLIENT_SECRET` - YouTube OAuth Secret (falls back to GOOGLE_CLIENT_SECRET)
- ⚠️ `YT_REDIRECT_URI` - Should be: `https://www.nnh.ae/api/youtube/oauth-callback` (auto-generated from NEXT_PUBLIC_BASE_URL if not set)

### AI Providers (Optional - for Composer feature)
- ⚠️ `GROQ_API_KEY` - Groq API key (recommended)
- ⚠️ `TOGETHER_API_KEY` - Together AI API key (fallback)
- ⚠️ `DEEPSEEK_API_KEY` - Deepseek API key (fallback)

### Domain & URLs
- ✅ `NEXT_PUBLIC_BASE_URL` - Production URL: `https://www.nnh.ae`
- ✅ `NEXT_PUBLIC_SITE_URL` - Same as above

---

## 🔧 Google Cloud Console Configuration

### Required APIs (Enable in Google Cloud Console)
- ✅ Google My Business API (Business Profile API)
- ✅ Google My Business Account Management API
- ✅ Google My Business Business Information API
- ⚠️ YouTube Data API v3

### OAuth 2.0 Redirect URIs
Add ALL of these to your OAuth 2.0 Client:

#### Production
- `https://www.nnh.ae/api/gmb/oauth-callback`
- `https://www.nnh.ae/api/youtube/oauth-callback`
- `https://www.nnh.ae/auth/callback`

#### Development (if testing locally)
- `http://localhost:3000/api/gmb/oauth-callback`
- `http://localhost:3000/api/youtube/oauth-callback`
- `http://localhost:3000/auth/callback`

### OAuth Scopes Required
For YouTube:
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `openid`

For GMB:
- `https://www.googleapis.com/auth/business.manage`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

---

## 🗄️ Database Setup

### Required Tables (Supabase)
- ✅ `profiles` - User profiles
- ✅ `gmb_accounts` - Connected GMB accounts
- ✅ `gmb_locations` - Business locations
- ✅ `gmb_reviews` - Customer reviews
- ✅ `oauth_states` - OAuth security states
- ✅ `oauth_tokens` - OAuth tokens (includes YouTube)
- ✅ `youtube_drafts` - Saved YouTube composer drafts

### Important Columns
#### `oauth_tokens` table
- `user_id` (UUID)
- `provider` (TEXT) - "gmb" or "youtube"
- `access_token` (TEXT)
- `refresh_token` (TEXT)
- `metadata` (JSONB) - Stores channel stats for YouTube
- `account_id` (TEXT) - Channel ID for YouTube
- `token_expires_at` (TIMESTAMPTZ)

### Required Indexes
- `UNIQUE(user_id, provider)` on `oauth_tokens`
- `UNIQUE(user_id, account_id)` on `gmb_accounts`

### RLS Policies
All tables should have RLS enabled with appropriate policies.

---

## 🧪 Pre-Publish Testing

### Core Functionality
- [ ] User can register/login
- [ ] User can connect GMB account
- [ ] User can sync GMB locations
- [ ] Reviews display correctly
- [ ] Analytics charts render
- [ ] AI Studio generates content

### YouTube Functionality
- [ ] User can connect YouTube account
- [ ] YouTube stats display on home page
- [ ] Recent videos display correctly
- [ ] Analytics charts show data
- [ ] Filters work (search, date range)
- [ ] CSV export works
- [ ] AI Composer generates content
- [ ] Drafts save and load correctly
- [ ] Token refresh works automatically

### Edge Cases
- [ ] User without connected accounts sees proper empty states
- [ ] API errors show user-friendly messages
- [ ] Loading states display correctly
- [ ] Mobile responsive design works

---

## 📝 Documentation

### Create/Finalize
- [ ] `.env.example` file with all required variables
- [ ] `README.md` with setup instructions
- [ ] `DEPLOYMENT_GUIDE.md` complete
- [ ] Update `PROJECT_SUMMARY.md` with YouTube info

---

## 🚀 Deployment Checklist

### Replit Configuration
- [ ] All environment variables set in Replit Secrets
- [ ] `.replit` file configured correctly
- [ ] Node.js version: 20
- [ ] Build command: `npm run build`
- [ ] Run command: `npm run start`

### Supabase Configuration
- [ ] Production Supabase project created
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Functions (if any) deployed
- [ ] Storage buckets configured (if using)

### Google Cloud Console
- [ ] All APIs enabled
- [ ] OAuth consent screen configured
- [ ] All redirect URIs added
- [ ] Scopes verified
- [ ] Keys rotated if compromised

### Domain & SSL
- [ ] Domain pointing to deployment
- [ ] SSL certificate active
- [ ] HTTPS enforced
- [ ] CORS configured correctly

---

## 🐛 Known Issues & Fixes

### Common Production Issues

#### Issue: "redirect_uri_mismatch"
**Cause**: Redirect URI not added to Google Console
**Fix**: Add exact URI from error to Google OAuth settings

#### Issue: YouTube videos not loading
**Cause**: Missing YouTube Data API v3 or insufficient quota
**Fix**: Enable API in Console, increase quota

#### Issue: "Failed to persist OAuth state"
**Cause**: Missing `oauth_states` table or RLS blocking admin client
**Fix**: Verify table exists, check RLS policies

#### Issue: Charts not rendering
**Cause**: Chart.js CDN blocked or CSP issues
**Fix**: Verify CDN URL accessibility, check CSP headers

---

## 📊 Performance Optimization

### Before Publish
- [ ] Images optimized (Next.js Image component)
- [ ] No console errors in production
- [ ] API response times < 2s
- [ ] Lighthouse score > 80
- [ ] Bundle size reasonable

---

## 🔒 Security Checklist

- [ ] All API routes protected with auth
- [ ] No secrets in client-side code
- [ ] RLS enabled on all tables
- [ ] CORS configured properly
- [ ] Rate limiting on API routes (consider)
- [ ] Input validation on all forms
- [ ] SQL injection protection (Supabase handles)
- [ ] XSS protection (React handles)

---

## 📱 Feature Parity Check

### From Legacy Dashboard
✅ Dashboard stats
✅ Account management
✅ Locations management
✅ Reviews management with AI responses
✅ Analytics charts
✅ YouTube Dashboard (NEW)
✅ AI Composer (NEW)
✅ CSV Export (NEW)
✅ Filters & Search (NEW)

---

## ✅ Final Sign-Off

Before publishing, ensure:
- [ ] All tests pass
- [ ] No critical errors in console
- [ ] Environment variables verified
- [ ] Database migrations applied
- [ ] Google Console configured
- [ ] Documentation complete
- [ ] Team notified of deployment

---

**Created**: January 2025  
**Last Updated**: January 2025  
**Status**: Ready for Review ⚠️

