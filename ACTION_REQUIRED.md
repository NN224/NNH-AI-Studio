# ⚠️ ACTION REQUIRED - Launch Checklist

## 📋 What's Left to Do (4 Steps Only!)

### ✅ Already Completed
- [x] All features implemented
- [x] Code pushed to GitHub
- [x] Documentation created
- [x] Legacy folder deleted

---

## 🚨 **STEP 1: Run SQL in Supabase** (5 minutes)

### What to do:
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy **ENTIRE** contents of `SQL_SETUP_COMPLETE.sql`
4. Paste into SQL Editor
5. Click **Run** button

### Why?
Creates YouTube tables and updates `oauth_tokens` structure

---

## 🔑 **STEP 2: Add Environment Variables** (10 minutes)

### In Replit:
1. Open **Secrets** tab
2. Add these variables:

```bash
# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google OAuth (you already have these)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://nnh.ae/api/gmb/oauth-callback

# YouTube (ADD THESE if different from GOOGLE_*)
YT_CLIENT_ID=xxx.apps.googleusercontent.com
YT_CLIENT_SECRET=GOCSPX-xxx

# AI Providers (OPTIONAL but recommended)
GROQ_API_KEY=gsk_xxx
TOGETHER_API_KEY=xxx
DEEPSEEK_API_KEY=xxx

# Domain
NEXT_PUBLIC_BASE_URL=https://nnh.ae
NEXT_PUBLIC_SITE_URL=https://nnh.ae
```

3. **Restart** deployment

---

## 🔧 **STEP 3: Enable APIs in Google Console** (5 minutes)

### APIs to Enable:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Library**
4. Search and **Enable**:
   - ✅ Google My Business API
   - ✅ Google My Business Account Management API  
   - ✅ Google My Business Business Information API
   - ⚠️ **YouTube Data API v3** (IMPORTANT!)

---

## 🔗 **STEP 4: Add Redirect URIs** (3 minutes)

### In Google Console:
1. Go to **APIs & Services** → **Credentials**
2. Edit your **OAuth 2.0 Client**
3. Under **Authorized redirect URIs**, add:
   ```
   https://nnh.ae/api/gmb/oauth-callback
   https://nnh.ae/api/youtube/oauth-callback
   https://nnh.ae/auth/callback
   ```
4. Click **Save**

---

## 🎉 After These 4 Steps

### You're Ready to Launch! 🚀

1. **Deploy** from Replit (already pushed)
2. **Test** login flow
3. **Test** GMB connection
4. **Test** YouTube connection

---

## 📊 Quick Status

| Task | Status | Time |
|------|--------|------|
| SQL Migration | ⚠️ TODO | 5 min |
| Environment Variables | ⚠️ TODO | 10 min |
| Google APIs | ⚠️ TODO | 5 min |
| Redirect URIs | ⚠️ TODO | 3 min |
| **TOTAL** | **23 minutes** | **~20 min** |

---

## 🆘 Need Help?

### If SQL fails:
- Check Supabase logs
- Verify table doesn't exist already
- Try running in parts

### If OAuth fails:
- Check redirect URI exactly matches
- Verify API is enabled
- Check environment variables are set

### If YouTube fails:
- Enable YouTube Data API v3
- Check YT_CLIENT_ID/YT_CLIENT_SECRET
- Verify scopes in OAuth consent screen

---

## 📞 Support

- Email: info@nnh.ae
- Phone: +971 543 6655 48
- WhatsApp: +971 58 883 9119

---

**Status**: ⚠️ **ACTION REQUIRED**  
**Time Needed**: 20-25 minutes  
**Difficulty**: Easy  
**Priority**: CRITICAL

