# OAuth Setup for Port 5050

## Problem
`invalid_grant` error when trying to login on localhost:5050

## Solution

### 1. Google Cloud Console
1. روح على: https://console.cloud.google.com/
2. اختر المشروع: `NNH-AI-Studio`
3. من القائمة الجانبية → **APIs & Services** → **Credentials**
4. اضغط على OAuth 2.0 Client ID (اللي بتستخدمو)
5. تحت **Authorized redirect URIs**، أضف:
   ```
   http://localhost:5050/auth/callback
   http://localhost:5050/api/auth/callback
   ```
6. اضغط **Save**

### 2. Supabase Dashboard
1. روح على: https://supabase.com/dashboard
2. اختر المشروع: `NNH-AI-Studio`
3. من القائمة الجانبية → **Authentication** → **URL Configuration**
4. تحت **Site URL**، أضف:
   ```
   http://localhost:5050
   ```
5. تحت **Redirect URLs**، أضف:
   ```
   http://localhost:5050/**
   http://localhost:5050/auth/callback
   ```
6. اضغط **Save**

### 3. Verify in Code
The OAuth callback handler is in:
- `app/[locale]/auth/callback/route.ts`

It should redirect to:
- Success: `/dashboard`
- Error: `/auth/auth-code-error`

### 4. Test
1. Navigate to: http://localhost:5050
2. Click "Continue with Google"
3. Should redirect to Google OAuth
4. After approval, should redirect back to: http://localhost:5050/auth/callback
5. Then redirect to: http://localhost:5050/dashboard

## Common Issues

### Issue 1: Still getting `invalid_grant`
- Clear browser cookies for localhost:5050
- Try incognito/private window
- Make sure you saved changes in Google Cloud Console

### Issue 2: Redirect loop
- Check Supabase redirect URLs include localhost:5050
- Check callback route is redirecting to `/dashboard` not `/home`

### Issue 3: CORS errors
- Check `next.config.ts` allows localhost
- Check Supabase CORS settings

## Alternative: Use Production OAuth
If localhost OAuth is problematic, you can:
1. Push to main
2. Test on production (www.nnh.ae)
3. OAuth will work there without changes

