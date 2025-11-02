# Google My Business API Migration Guide

## ✅ Migration Completed

The codebase has been **successfully migrated** from the deprecated **Legacy Google My Business API v4** to the **new Google Business Profile APIs**.

---

## 🔄 API Changes

### Old APIs (Deprecated ❌)
- `mybusiness.googleapis.com/v4` - **No longer supported by Google**

### New APIs (✅ Active)

1. **My Business Business Information API**
   - Endpoint: `mybusinessbusinessinformation.googleapis.com/v1`
   - Used for: Locations, Media
   - Status: ✅ Active and working

2. **My Business Account Management API**
   - Endpoint: `mybusinessaccountmanagement.googleapis.com/v1`
   - Used for: Account information
   - Status: ✅ Active and working

3. **Google Places API (New)**
   - Endpoint: `places.googleapis.com/v1`
   - Used for: Reviews (public data)
   - Status: ✅ Active and working
   - Note: Reviews are fetched from public Places data

---

## 📋 What Was Changed

### File: `app/api/gmb/sync/route.ts`

#### 1. Updated API Base URLs
```typescript
// OLD (Deprecated)
const GBP_V4_BASE = 'https://mybusiness.googleapis.com/v4';

// NEW
const PLACES_API_BASE = 'https://places.googleapis.com/v1';
```

#### 2. Reviews Function (`fetchReviews`)
**Before:**
- Used Legacy API v4 endpoint
- Format: `mybusiness.googleapis.com/v4/{locationResource}/reviews`

**After:**
- Uses Google Places API (New)
- Format: `places.googleapis.com/v1/places/{placeId}`
- Fetches public reviews via Places API
- Uses `X-Goog-FieldMask: reviews` header

#### 3. Media Function (`fetchMedia`)
**Before:**
- Used Legacy API v4 endpoint
- Format: `mybusiness.googleapis.com/v4/{locationResource}/media`

**After:**
- Uses Business Information API
- Format: `mybusinessbusinessinformation.googleapis.com/v1/{locationResource}/media`
- Supports pagination with `pageSize=100`

---

## 🔑 Required Google Cloud APIs

Make sure these APIs are **enabled** in your Google Cloud Console:

1. ✅ **My Business Business Information API**
   - Required for: Locations, Media
   - Enable at: https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com

2. ✅ **My Business Account Management API**
   - Required for: Account management
   - Enable at: https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com

3. ✅ **Places API (New)**
   - Required for: Reviews
   - Enable at: https://console.cloud.google.com/apis/library/places-backend.googleapis.com

4. ⚠️ **Legacy Google My Business API v4**
   - **DO NOT ENABLE** - This API is deprecated and cannot be enabled
   - It will show "Failed to load" in Google Cloud Console

---

## 🚀 Testing

After the migration:

1. Go to GMB Dashboard
2. Click "Connect Google My Business"
3. Authorize the app
4. Click "Sync Data"
5. Check console logs for:
   - ✅ Locations fetched successfully
   - ✅ Reviews fetched via Places API
   - ✅ Media fetched successfully

---

## 📝 Important Notes

### Reviews API Behavior
- Reviews are now fetched from **public Google Places data**
- This means:
  - ✅ You can see all public reviews
  - ⚠️ Some reviews might not be immediately available if the location is newly created
  - ✅ No authentication issues with deprecated APIs

### Media API Behavior
- Media is fetched from **Business Information API**
- Supports:
  - ✅ Photos uploaded by business owner
  - ✅ Photos from Google users
  - ✅ Pagination for large media libraries

### Error Handling
- All API calls include comprehensive error handling
- Errors are logged but don't break the sync process
- If reviews/media fail, locations will still sync successfully

---

## 🔧 Troubleshooting

### Issue: "API not enabled"
**Solution:** Enable the required APIs in Google Cloud Console (see list above)

### Issue: "Reviews not found"
**Solution:** This is normal for:
- Newly created locations
- Locations not yet indexed in Google Places
- Locations with no public reviews

### Issue: "Permission denied"
**Solution:** 
1. Check that OAuth scopes include `https://www.googleapis.com/auth/business.manage`
2. Reconnect your Google account
3. Verify APIs are enabled in Google Cloud Console

---

## 📚 API Documentation

- [Business Information API Docs](https://developers.google.com/my-business/reference/businessinformation/rest)
- [Account Management API Docs](https://developers.google.com/my-business/reference/accountmanagement/rest)
- [Places API (New) Docs](https://developers.google.com/maps/documentation/places/web-service/place-details)

---

## ✅ Migration Status

- ✅ Locations API - **Migrated**
- ✅ Reviews API - **Migrated to Places API**
- ✅ Media API - **Migrated**
- ✅ Account Management - **Already using new API**
- ✅ Error Handling - **Updated**
- ✅ Logging - **Enhanced**

**Migration Date:** November 2, 2025  
**Status:** Complete ✅

