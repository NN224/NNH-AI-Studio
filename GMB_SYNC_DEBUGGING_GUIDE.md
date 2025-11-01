# GMB Sync Debugging Guide

## Current Issue
The GMB sync is working for Locations but failing for Reviews and Media endpoints with non-JSON responses.

## Error Pattern
```
[GMB Sync] Non-JSON error response: *{ma
[GMB Sync] Failed to fetch reviews for location: locations/11247391224469965786 {}
[GMB Sync] Failed to fetch media for location: locations/11247391224469965786 {}
```

## Analysis

### ✅ What's Working
- **OAuth Flow**: Connection and token refresh working
- **Locations Sync**: Successfully fetching and storing locations
- **API Endpoints**: Using correct Google Business Profile v4 API

### ⚠️ What's Failing
- **Reviews Endpoint**: `mybusiness.googleapis.com/v4/locations/{id}/reviews`
- **Media Endpoint**: `mybusiness.googleapis.com/v4/locations/{id}/media`

## Possible Causes

### 1. API Version/Endpoint Issue
Google has multiple API versions and endpoints:
- **V4**: `mybusiness.googleapis.com/v4`
- **Business Info API**: `mybusinessbusinessinformation.googleapis.com/v1` (works for locations)
- **Account Management API**: `mybusinessaccountmanagement.googleapis.com/v1`

The reviews and media endpoints might need a different base URL or version.

### 2. Scope/Permission Issue
Current scopes:
```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];
```

The `business.manage` scope should cover reviews and media, but there might be:
- Additional scopes needed for newer endpoints
- API version specific permissions
- Location-level permissions not propagated

### 3. Location Resource Format
The location resource being passed is: `locations/11247391224469965786`

This looks correct for V4 API, but:
- Might need full path: `accounts/{account_id}/locations/{location_id}`
- Might need account-prefixed format
- Different API version requires different format

### 4. API Deprecation/Migration
Google Business Profile API went through significant changes:
- Old "My Business API" was deprecated
- Migrated to "Google Business Profile API"
- Reviews and media endpoints might have changed format or requirements

## Debugging Steps Added

### Enhanced Logging
The following improvements have been added:
1. **URL Logging**: Print full API URLs before requests
2. **Status Logging**: Log HTTP status codes and status text
3. **Header Logging**: Print response headers
4. **Response Preview**: Show first 500 chars of error response

### Next Steps to Debug

1. **Check Logs**:
   - Run sync again and check for detailed error messages
   - Look for HTTP status codes (404, 403, 500, etc.)
   - Check if response headers reveal the issue

2. **Verify Location ID Format**:
   - Confirm `location.location_id` contains the right value
   - Might need to use `accountId/locationId` format

3. **Test Alternative Endpoints**:
   - Try Business Info API: `mybusinessbusinessinformation.googleapis.com/v1/{location}/reviews`
   - Try without trailing `/reviews` or `/media`
   - Try GET vs other methods

4. **Check API Documentation**:
   - Review latest Google Business Profile API docs
   - Check if endpoints moved to different API version
   - Verify required parameters for reviews/media

5. **Account Type Check**:
   - Some business types might not support reviews/media
   - Limited permission accounts might not have access
   - API might require business verification

## Temporary Workaround

Reviews and media fetching gracefully returns empty arrays instead of crashing:
- Locations sync completes successfully ✅
- Reviews and media sync silently skip failures ⚠️
- Dashboard shows 0 reviews/media but locations work

This allows the dashboard to function while we debug the API issues.

## Recommended Actions

1. ✅ **Run the enhanced logging** - See detailed error messages
2. 🔄 **Check Google Business Profile API documentation** - Verify correct endpoints
3. 🔄 **Review account permissions** - Ensure business account has necessary access
4. 🔄 **Test with Google API Explorer** - Manually test endpoints to confirm they work
5. 🔄 **Consider API version** - Might need to use newer or older API version

## Files Modified
- `app/api/gmb/sync/route.ts` - Enhanced error logging
- Logs now show: URL, status, headers, response preview

## Related Documentation
- Google Business Profile API: https://developers.google.com/my-business
- API Reference: https://developers.google.com/my-business/samples
- Migration Guide: https://developers.google.com/my-business/content/basic-setup

