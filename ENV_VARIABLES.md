# 🔐 Environment Variables Guide

## Required Variables (Must Set)

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Domain & URLs
```bash
NEXT_PUBLIC_BASE_URL=https://www.nnh.ae
NEXT_PUBLIC_SITE_URL=https://www.nnh.ae
```

### Google OAuth (GMB)
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=https://www.nnh.ae/api/gmb/oauth-callback
```

---

## Optional Variables

### YouTube OAuth (Falls back to GOOGLE_* if not set)
```bash
YT_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
YT_CLIENT_SECRET=GOCSPX-your-youtube-client-secret
YT_REDIRECT_URI=https://www.nnh.ae/api/youtube/oauth-callback
```

### AI Providers (For Composer - need at least ONE)
```bash
GROQ_API_KEY=gsk_your-groq-api-key
TOGETHER_API_KEY=your-together-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

---

## Where to Set

### Replit
1. Open Settings → Secrets
2. Add each variable
3. Restart deployment

### Vercel
1. Project Settings → Environment Variables
2. Add for Production/Preview/Development
3. Redeploy

### Local Development
Create `.env.local` in project root.

