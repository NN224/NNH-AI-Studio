# ⚡ Quick Start - Last 4 Steps to Launch

## ✅ What's Already Done
- [x] All features implemented
- [x] Code pushed to GitHub  
- [x] Documentation created
- [x] Legacy folder deleted
- [x] All URLs updated to `nnh.ae` (without www)

---

## 🚀 4 Steps to Launch (20 minutes)

### **STEP 1: Supabase SQL** (5 min)
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire SQL_SETUP_COMPLETE.sql
4. Paste and Run
```

### **STEP 2: Environment Variables** (10 min)
```bash
1. Open Replit → Secrets
2. Add if not already there:
   - NEXT_PUBLIC_BASE_URL=https://nnh.ae
   - NEXT_PUBLIC_SITE_URL=https://nnh.ae
   - GOOGLE_REDIRECT_URI=https://nnh.ae/api/gmb/oauth-callback
   - YT_CLIENT_ID (if different from GOOGLE_CLIENT_ID)
   - YT_CLIENT_SECRET (if different from GOOGLE_CLIENT_SECRET)
   - GROQ_API_KEY (optional but recommended)
3. Restart deployment
```

### **STEP 3: Enable YouTube API** (5 min)
```bash
1. Google Cloud Console
2. APIs & Services → Library
3. Enable: "YouTube Data API v3"
```

### **STEP 4: Add Redirect URIs** (3 min)
```bash
1. Google Cloud Console
2. APIs & Services → Credentials
3. Edit OAuth 2.0 Client
4. Add to Authorized redirect URIs:
   ✅ https://nnh.ae/api/gmb/oauth-callback
   ✅ https://nnh.ae/api/youtube/oauth-callback
   ✅ https://nnh.ae/auth/callback
5. Save
```

---

## 🎉 You're Done!

After these 4 steps:
- ✅ Deploy from Replit
- ✅ Test login
- ✅ Test GMB connection
- ✅ Test YouTube connection

**Status**: 🟢 Ready to Launch!  
**Time**: 20 minutes  

---

## 📞 Need Help?
- See `ACTION_REQUIRED.md` for detailed steps
- See `ENV_VARIABLES.md` for environment setup
- See `SQL_SETUP_COMPLETE.sql` for database

