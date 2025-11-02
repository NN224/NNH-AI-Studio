# 🚀 Enable Required Google APIs

## Step-by-Step Guide

Follow these steps to enable all required APIs for GMB Dashboard:

---

## 1️⃣ Go to Google Cloud Console

Visit: https://console.cloud.google.com/

Select your project: **462186989347**

---

## 2️⃣ Enable Required APIs

Click on the links below and click **"Enable"** for each API:

### ✅ My Business Business Information API
**Required for:** Locations, Media

👉 **Enable here:**
```
https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com?project=462186989347
```

---

### ✅ My Business Account Management API
**Required for:** Account information

👉 **Enable here:**
```
https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com?project=462186989347
```

---

### ✅ Places API (New)
**Required for:** Reviews (public data)

👉 **Enable here:**
```
https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=462186989347
```

---

## 3️⃣ Wait 2-3 Minutes

After enabling all APIs, wait a few minutes for changes to propagate.

---

## 4️⃣ Test the Integration

1. Go to your GMB Dashboard
2. Click **"Connect Google My Business"**
3. Authorize the app
4. Click **"Sync Data"**
5. Check that data appears:
   - ✅ Locations
   - ✅ Reviews
   - ✅ Media

---

## ⚠️ Important Notes

### DO NOT Enable Legacy API
❌ **Do NOT try to enable:** `Google My Business API` (Legacy v4)
- This API is **deprecated** and shows "Failed to load"
- It is **no longer supported by Google**
- Our app now uses the **new APIs** listed above

### OAuth Scope
The app requests this scope:
```
https://www.googleapis.com/auth/business.manage
```
This scope covers all the new Business Profile APIs.

---

## 🔍 Verify APIs are Enabled

To check if APIs are enabled:

1. Go to: https://console.cloud.google.com/apis/dashboard?project=462186989347
2. Look for these APIs in the list:
   - ✅ My Business Business Information API
   - ✅ My Business Account Management API
   - ✅ Places API

---

## 🐛 Troubleshooting

### Error: "API not enabled"
**Solution:** Make sure you clicked "Enable" on all 3 APIs above

### Error: "Permission denied"
**Solution:** 
1. Disconnect GMB account in Settings
2. Enable all APIs (wait 2-3 minutes)
3. Reconnect GMB account

### Error: "Failed to load API page"
**Solution:** This is expected for the **Legacy API** - ignore it and use the new APIs instead

---

## ✅ Success!

Once all APIs are enabled and you've tested successfully, you're all set! 🎉

Your GMB Dashboard will now:
- ✅ Sync locations automatically
- ✅ Fetch reviews from Google Places
- ✅ Display media items
- ✅ Show real-time data

---

**Questions?** Check the detailed migration guide: `GMB_API_MIGRATION.md`

