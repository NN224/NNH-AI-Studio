# Dashboard Buttons Test Plan

## Purpose
Verify Sync, Disconnect, Connect, and Refresh buttons work correctly after removing duplicates and fixing event handling.

## Pre-requisites
1. Active user session
2. Connected GMB account
3. Browser DevTools console open

---

## Test 1: Refresh Button

**Steps:**
1. Click "Refresh Now" button in header
2. Check console for logs
3. Verify dashboard reloads

**Expected Console Logs:**
```
[RefreshButton] Dashboard refresh triggered
[refreshDashboard] started
[refreshDashboard] completed successfully
```

**Expected UI:**
- Button shows "Refreshing..." briefly
- Spinner animation appears
- Toast: "Dashboard refreshed successfully!"
- Page refreshes

**Pass/Fail:**
- [ ] Console logs present ✓/✗
- [ ] UI feedback correct ✓/✗
- [ ] No errors in console ✓/✗

---

## Test 2: Sync Button

**Steps:**
1. Locate "Sync Now" button in Active Location card
2. Click the button
3. Monitor console

**Expected Console Logs:**
```
[handleSync] starting for location [location_id]
[syncLocation] started for [location_id]
[syncReviewsFromGoogle] started...
[syncLocation] completed successfully
```

**Expected UI:**
- Button shows "⏳ Syncing..." during operation
- Toast: "Location synced successfully!" OR specific message
- Dashboard auto-refreshes after sync

**Pass/Fail:**
- [ ] Console logs present ✓/✗
- [ ] UI feedback correct ✓/✗
- [ ] Reviews updated after sync ✓/✗
- [ ] No errors ✓/✗

---

## Test 3: Disconnect Button

**Steps:**
1. Click "Disconnect" button in Active Location card
2. Verify modal appears
3. Read modal text
4. Click "Disconnect" (or "Cancel" to abort)

**Expected Console Logs:**
```
[handleDisconnect] starting for location [location_id]
[disconnectLocation] started
[disconnectLocation] finished successfully for [location_id]
```

**Expected UI:**
- Modal title: "Disconnect Location?"
- Modal message: "Are you sure you want to disconnect this location?..."
- Confirm button is red/destructive
- After confirm: Toast "Location disconnected successfully"
- Location status changes to "Disconnected"
- Dashboard refreshes

**Pass/Fail:**
- [ ] Modal appears ✓/✗
- [ ] Console logs correct ✓/✗
- [ ] Location disconnected in DB ✓/✗
- [ ] UI reflects disconnection ✓/✗
- [ ] No errors ✓/✗

---

## Test 4: Event Handling (RefreshOnEvent)

**Steps:**
1. Open console
2. Manually dispatch event:
   ```javascript
   window.dispatchEvent(new Event('dashboard:refresh'))
   ```
3. Verify page refreshes

**Expected Behavior:**
- Router triggers refresh
- No errors

**Pass/Fail:**
- [ ] Page refreshes on event ✓/✗

---

## Test 5: Error Scenarios

### Test 5a: Sync with invalid location
**Steps:**
1. Tamper with locationId in DevTools (or mock error)
2. Click Sync

**Expected:**
- Toast error: "Failed to sync location" or specific error
- Console error logged
- No crash

**Pass/Fail:**
- [ ] Error handled gracefully ✓/✗

### Test 5b: Disconnect with no network
**Steps:**
1. Disable network in DevTools
2. Click Disconnect → Confirm

**Expected:**
- Toast error: "An unexpected error occurred"
- Modal stays open or closes with error
- Console error logged

**Pass/Fail:**
- [ ] Error handled gracefully ✓/✗

---

## Test 6: Rapid Clicks (Race Conditions)

**Steps:**
1. Quickly click Refresh button 5 times
2. Monitor console

**Expected:**
- Button disabled during action
- Only one request fires
- No duplicate events

**Pass/Fail:**
- [ ] No race conditions ✓/✗

---

## Summary

| Test | Status | Notes |
|------|--------|-------|
| Refresh Button | ⬜ | |
| Sync Button | ⬜ | |
| Disconnect Button | ⬜ | |
| RefreshOnEvent | ⬜ | |
| Error: Sync Invalid | ⬜ | |
| Error: Disconnect Network | ⬜ | |
| Rapid Clicks | ⬜ | |

---

## Common Issues to Watch For

1. **Duplicate event listeners**: Multiple refreshes on single click
2. **Missing toast messages**: User gets no feedback
3. **Event not propagating**: window.dispatchEvent doesn't trigger refresh
4. **Modal not closing**: After disconnect, modal stays open
5. **Loading state stuck**: Button stays in "loading" forever
6. **Console errors**: TypeScript errors, API 401/500s

---

## Quick Debug Commands

```javascript
// Check if RefreshOnEvent is mounted
window.addEventListener('dashboard:refresh', () => console.log('Event caught!'))

// Check active location
document.querySelector('[data-location-id]')?.dataset.locationId

// Force refresh
window.dispatchEvent(new Event('dashboard:refresh'))

// Check if buttons are disabled
document.querySelectorAll('button[disabled]')
```

---

## Next Steps After Testing

1. If all tests pass → Commit changes
2. If issues found → Document in console-errors.log
3. Fix identified issues one by one
4. Re-test after each fix
