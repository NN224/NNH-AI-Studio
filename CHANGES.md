# GMB Connection Flow Refactor - Changes Summary

## Issue Fixed
Users remained "Connected" after disconnecting their GMB account due to incomplete backend cleanup.

## Root Cause
The `disconnectLocation` function in `app/[locale]/(dashboard)/dashboard/actions.ts` was:
1. Only updating location-level flags (not account-level)
2. Not clearing OAuth credentials (access_token, refresh_token)
3. Not setting the account's `is_active` flag to `false`
4. Deleting data immediately instead of offering retention options

## Solution Implemented

### Backend Changes
Updated `disconnectLocation` to:
- Extract the GMB account ID from the location record
- Delegate to the comprehensive `disconnectGMBAccount` function
- Properly clear credentials: `access_token` → NULL, `refresh_token` → NULL
- Set `is_active` → `false` (critical for UI state recognition)
- Support data retention options (keep/export/delete)
- Maintain backward compatibility with a fallback for locations without account IDs

### UI Verification
Confirmed existing implementation is correct:
- `GMBConnectionManager` component properly calls `disconnectGMBAccount`
- Dashboard uses compact variant with `handleGMBSuccess` callback
- Settings page uses full variant through `AccountConnectionTab`
- `useGmbStatus` hook filters for `is_active: true` accounts only
- After disconnect, callback chain updates state: `refreshGmbStatus()` → `onSuccess()` → `fetchConnectionStatus()` → `setGmbConnected(false)`

## Files Modified
- `app/[locale]/(dashboard)/dashboard/actions.ts` - Updated `disconnectLocation` function

## Testing
- ✅ Build successful (no errors)
- ✅ Linter clean (no new warnings)
- ✅ Existing test coverage in `tests/gmb-connection-flow.test.ts`
- ✅ Type safety maintained with `DisconnectLocationResult` interface

## Data Flow After Disconnect
1. User clicks "Disconnect" in GMBConnectionManager
2. `disconnectGMBAccount(accountId, option)` called
3. Database updated:
   - `gmb_accounts.is_active` → `false`
   - `gmb_accounts.access_token` → `NULL`
   - `gmb_accounts.refresh_token` → `NULL`
   - `gmb_accounts.expires_at` → `NULL`
   - `gmb_accounts.disconnected_at` → current timestamp
4. Location and related data handled per option (keep/export/delete)
5. Component refreshes: `refreshGmbStatus()` and `onSuccess()`
6. Dashboard re-queries active accounts (filters `is_active: true`)
7. No active accounts found → `gmbConnected: false`
8. UI updates to show disconnected state

## Impact
- ✅ Users see immediate "disconnected" state after disconnect
- ✅ No manual page refresh required
- ✅ Credentials properly cleared from database
- ✅ Data retention options respected
- ✅ OAuth tokens invalidated
- ✅ Backward compatible with existing code
