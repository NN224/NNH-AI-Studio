# 🧠 Project Context - Quick Reference

**For AI Assistants**: This file contains essential project information for context retention across sessions.

---

## 📋 Project Overview

**Platform**: NNH AI Studio - GMB & YouTube Management Platform  
**Stack**: Next.js 14 (App Router) + Supabase (PostgreSQL) + TypeScript  
**Status**: ✅ Production Ready - LAUNCHED  
**Domain**: https://nnh.ae

---

## 🔑 Critical Information

### Architecture
- **Frontend**: Next.js 14 App Router, React 18.3, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (Auth + PostgreSQL + RLS)
- **OAuth**: Google OAuth 2.0 for GMB + YouTube
- **AI**: Groq, Together AI, Deepseek (for content generation)

### Key Features
1. **GMB Management**: Multi-account, locations, reviews, AI replies, analytics
2. **YouTube Dashboard**: Stats, videos, comments, analytics, AI composer, drafts
3. **Analytics**: Charts, sentiment analysis, performance tracking
4. **Security**: RLS policies, user_id filtering everywhere

### Database Tables
```
gmb_accounts, gmb_locations, gmb_reviews, gmb_media
oauth_tokens (provider: gmb/youtube), oauth_states
youtube_drafts, profiles, activity_logs
gmb_locations_with_rating (view)
```

### Important Security Notes
- ⚠️ **CRITICAL**: ALL queries MUST filter by `user_id` or `auth.uid()`
- Never fetch data without user context
- RLS policies enforce data isolation per user

---

## 🚨 Common Issues & Fixes

### Redirect URI Mismatch
**Solution**: Use `https://nnh.ae` (NO www) consistently
- Google Console: Authorized redirect URIs
- Environment variables: `NEXT_PUBLIC_BASE_URL`, `GOOGLE_REDIRECT_URI`

### Missing user_id Filter (Security Issue)
**Symptom**: Users see other users' data  
**Solution**: Add `.eq("user_id", user.id)` to ALL database queries
**Fixed in**: All analytics components, dashboard pages

### Arabic Text in UI
**Status**: ✅ ALL converted to English
- YouTube Dashboard: English only
- Docs: English only (Arabic docs deleted)

### Legacy Folder
**Status**: ✅ Deleted from GitHub
- Old Express.js platform removed
- Focus on Next.js version only

---

## 📁 Key File Locations

### Configuration
- `SQL_SETUP_COMPLETE.sql` - Database schema
- `ENV_VARIABLES.md` - Environment setup
- `ACTION_REQUIRED.md` - Launch checklist
- `.env.local` - Local environment (gitignored)

### Core Pages
- `app/home/page.tsx` - Landing dashboard
- `app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `app/(dashboard)/analytics/page.tsx` - Analytics
- `app/(dashboard)/locations/page.tsx` - GMB locations
- `app/(dashboard)/reviews/page.tsx` - Review management
- `app/youtube-dashboard/page.tsx` - YouTube dashboard
- `app/(dashboard)/accounts/page.tsx` - Account management

### API Routes
- `app/api/gmb/create-auth-url/route.ts` - GMB OAuth start
- `app/api/gmb/oauth-callback/route.ts` - GMB OAuth callback
- `app/api/gmb/sync/route.ts` - Sync GMB data
- `app/api/youtube/*/route.ts` - YouTube endpoints (11 routes)

### Components
- `components/analytics/*.tsx` - Analytics charts
- `components/accounts/*.tsx` - Account management
- `components/locations/*.tsx` - Location UI
- `components/reviews/*.tsx` - Review UI

---

## 🔧 Technical Decisions

### OAuth Flow
1. User clicks "Connect" → POST `/api/gmb/create-auth-url`
2. Redirect to Google → User authorizes
3. Google redirects → `/api/gmb/oauth-callback`
4. Exchange code for tokens → Save to database
5. Redirect to dashboard

### Token Management
- **Access Token**: Short-lived, auto-refresh
- **Refresh Token**: Long-lived, stored securely
- **Automatic Refresh**: `/api/youtube/token/refresh-if-needed`

### Data Sync
- **GMB**: Manual sync via button click
- **YouTube**: Auto-sync on page load + refresh button

### AI Content Generation
- **Fallback Chain**: Groq → Together AI → Deepseek
- **Use Cases**: Review replies, YouTube composer
- **Storage**: Drafts saved in `youtube_drafts` table

---

## 🎯 Current Status

### ✅ Completed
- [x] All features implemented
- [x] Security fixes (user_id filtering)
- [x] Arabic to English conversion
- [x] Documentation complete
- [x] Legacy cleanup
- [x] Production deployment
- [x] OAuth flows working
- [x] Analytics functional

### 🐛 Known Issues
- None currently

### 📝 TODO
- Monitor production logs
- Collect user feedback
- Plan Phase 2 features

---

## 🚀 Deployment

### Environment Variables (Replit Secrets)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://nnh.ae/api/gmb/oauth-callback

# YouTube (optional, falls back to GOOGLE_*)
YT_CLIENT_ID=xxx.apps.googleusercontent.com
YT_CLIENT_SECRET=GOCSPX-xxx

# AI (optional)
GROQ_API_KEY=gsk_xxx
TOGETHER_API_KEY=xxx
DEEPSEEK_API_KEY=xxx

# Domain
NEXT_PUBLIC_BASE_URL=https://nnh.ae
NEXT_PUBLIC_SITE_URL=https://nnh.ae
```

### Google Console Setup
1. Enable APIs: GMB API, GMB Account Management, GMB Business Info, YouTube Data API v3
2. Add Redirect URIs:
   - `https://nnh.ae/api/gmb/oauth-callback`
   - `https://nnh.ae/api/youtube/oauth-callback`
   - `https://nnh.ae/auth/callback`

### Supabase Setup
Run `SQL_SETUP_COMPLETE.sql` in SQL Editor

---

## 📊 Feature Roadmap

### Phase 1 (Current) ✅
- GMB basic management
- YouTube basic dashboard
- Analytics
- AI composer

### Phase 2 (1-2 months)
- YouTube video upload
- GMB keyword rankings
- GMB posts management

### Phase 3 (3-4 months)
- Comment replies
- Media gallery
- Local directories

### Phase 4 (5-6 months)
- Autopilot/automations
- Advanced analytics
- AI voice studio

---

## 🔗 Important Links

- **Production**: https://nnh.ae
- **Repo**: https://github.com/NNH-AI-Studio/nnh_new
- **Supabase**: https://supabase.com/dashboard
- **Google Console**: https://console.cloud.google.com

---

## 💡 Development Tips

### Database Queries
Always use:
```typescript
const { data: { user } } = await supabase.auth.getUser()
.eq("user_id", user.id)  // NEVER skip this!
```

### API Routes
- Server components: Use `createClient()` from `@/lib/supabase/server`
- Client components: Use `createClient()` from `@/lib/supabase/client`

### Error Handling
- Always check `response.ok` before `response.json()`
- Use `try...catch` for all async operations
- Log errors to console for debugging

### Testing
- Test OAuth flows end-to-end
- Verify user isolation (no data leakage)
- Check all analytics components
- Test on multiple browsers

---

## 📞 Contact

- Email: info@nnh.ae
- Phone: +971 543 6655 48
- WhatsApp: +971 58 883 9119

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: Production

