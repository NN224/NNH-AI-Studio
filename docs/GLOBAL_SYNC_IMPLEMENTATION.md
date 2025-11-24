# 🔄 Global Sync System

## Overview

A unified synchronization system that replaces scattered sync buttons across the application with a centralized, context-based approach. Features auto-sync after OAuth connection with real-time progress tracking.

---

## ✨ Features

### 1. **Centralized Sync State** (`contexts/SyncContext.tsx`)

- Single source of truth for all sync operations
- Integrates with:
  - `useSyncProgress` (real-time SSE/polling)
  - `useSyncStatus` (sync queue monitoring)
  - `useGMBConnection` (account status)
- Provides global sync state, progress, counts, and control functions

### 2. **Global Sync Button** (`components/sync/global-sync-button.tsx`)

- Always visible in header
- Shows:
  - Last sync time (e.g., "Synced 2h ago")
  - Current sync progress (percentage + stage)
  - Error states
  - Real-time counts (locations, reviews, questions)
- Tooltip with detailed status
- Bilingual support (EN/AR)

### 3. **First-Time Sync Overlay** (`components/sync/first-sync-overlay.tsx`)

- Full-screen overlay triggered after OAuth callback
- Auto-starts sync on first connection
- Shows animated progress for:
  - Locations ✓
  - Reviews ✓
  - Questions ✓
  - Posts ✓
- Real-time progress bar with ETA
- Success animation + auto-redirect

### 4. **OAuth Integration**

- Modified `/api/gmb/oauth-callback/route.ts`
- Redirects to `/dashboard?autoSync=true` after connection
- Triggers first-sync overlay automatically

### 5. **Rate Limiting Updates**

- Increased GMB sync limits:
  - `GMB_SYNC`: 10 syncs per 10 minutes (was 5 per 5 min)
  - `GMB_SYNC_PROGRESS`: 200 polls per minute (new)
- Prevents blocking long-running syncs

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  SyncProvider                    │
│  (Wraps entire dashboard in layout.tsx)         │
├─────────────────────────────────────────────────┤
│                                                  │
│  State Management:                               │
│  • useSyncProgress (SSE + polling fallback)     │
│  • useSyncStatus (sync_queue monitoring)        │
│  • useGMBConnection (account status)            │
│                                                  │
│  Provides:                                       │
│  • status: GlobalSyncStatus                     │
│  • triggerSync(): Promise<void>                 │
│  • isFirstSync: boolean                         │
│  • activeAccountId: string | null               │
│                                                  │
└─────────────────────────────────────────────────┘
           ▼                    ▼
    ┌──────────────┐    ┌──────────────────┐
    │ GlobalSync   │    │ FirstSyncOverlay │
    │   Button     │    │  (auto-trigger)  │
    │  (header)    │    │                  │
    └──────────────┘    └──────────────────┘
```

---

## 📦 Files Created/Modified

### **New Files**

1. `contexts/SyncContext.tsx` - Global sync state management
2. `components/sync/global-sync-button.tsx` - Header sync button
3. `components/sync/first-sync-overlay.tsx` - Full-screen first-sync UI

### **Modified Files**

1. `app/[locale]/(dashboard)/layout.tsx`
   - Wrapped with `<SyncProvider>`
   - Added `<FirstSyncOverlay />`

2. `components/layout/header.tsx`
   - Added `<GlobalSyncButton />` before keyboard shortcuts

3. `app/api/gmb/oauth-callback/route.ts`
   - Redirect URL changed to include `?autoSync=true`

4. `lib/security/rate-limiter.ts`
   - Increased `GMB_SYNC` limits
   - Added `GMB_SYNC_PROGRESS` config

---

## 🚀 Usage

### For Users

#### **First-Time Connection**

1. Click "Connect GMB Account"
2. Complete OAuth flow
3. **Automatically redirected** to dashboard
4. **Full-screen overlay appears**:
   - Shows real-time sync progress
   - Displays counts: locations, reviews, questions
   - ETA calculation
   - Success animation
5. Auto-redirect to dashboard with data

#### **Manual Sync (Existing Users)**

1. Look at header (top-right)
2. Click **Sync** button
3. See real-time progress in tooltip
4. Data refreshes automatically

---

### For Developers

#### **Access Sync State Anywhere**

```tsx
import { useSync } from '@/contexts/SyncContext'

function MyComponent() {
  const { status, triggerSync, isFirstSync } = useSync()

  return (
    <div>
      {status.isSyncing && <p>Syncing... {status.percentage}%</p>}
      <button onClick={triggerSync}>Sync Now</button>
    </div>
  )
}
```

#### **GlobalSyncStatus Interface**

```typescript
interface GlobalSyncStatus {
  isSyncing: boolean
  lastSync: Date | null
  error: string | null
  progress: {
    locations: 'pending' | 'syncing' | 'done' | 'error'
    reviews: 'pending' | 'syncing' | 'done' | 'error'
    questions: 'pending' | 'syncing' | 'done' | 'error'
    posts: 'pending' | 'syncing' | 'done' | 'error'
    media: 'pending' | 'syncing' | 'done' | 'error'
  }
  counts: {
    locations: number
    reviews: number
    questions: number
    posts: number
  }
  percentage: number
  currentStage?: string
  estimatedTimeMs?: number | null
}
```

#### **Trigger Sync Programmatically**

```tsx
const { triggerSync } = useSync()

await triggerSync() // Returns promise
```

---

## 🧪 Testing

### **Test Checklist**

#### **1. New User Flow (First Sync)**

- [ ] Connect GMB account via OAuth
- [ ] Redirects to `/dashboard?autoSync=true`
- [ ] First-sync overlay appears automatically
- [ ] Sync starts without user action
- [ ] Progress updates in real-time
- [ ] Stages update: locations → reviews → questions → posts
- [ ] Counts display correctly
- [ ] ETA shows reasonable estimate
- [ ] Success animation displays
- [ ] Auto-redirects to dashboard after 2 seconds
- [ ] URL parameters removed (`?autoSync=true`)
- [ ] Dashboard shows synced data

#### **2. Existing User Flow (Manual Sync)**

- [ ] Login to dashboard
- [ ] See sync button in header (top-right)
- [ ] Tooltip shows "Last sync: X ago"
- [ ] Click sync button
- [ ] Button shows spinner animation
- [ ] Tooltip updates with real-time progress
- [ ] Counts appear in tooltip as synced
- [ ] Data refreshes in dashboard
- [ ] Toast notification shows "Synced ✓"
- [ ] Last sync time updates

#### **3. Error Handling**

- [ ] Disconnect internet
- [ ] Click sync button
- [ ] Error state shows in button (red dot)
- [ ] Tooltip shows error message
- [ ] Reconnect internet
- [ ] Click sync again
- [ ] Sync succeeds

#### **4. Multi-Tab Behavior**

- [ ] Open dashboard in two tabs
- [ ] Trigger sync in Tab 1
- [ ] Tab 2 should reflect sync state (via polling)
- [ ] Both tabs update when sync completes

#### **5. Rate Limiting**

- [ ] Trigger 10 syncs rapidly
- [ ] 11th sync should show rate limit message
- [ ] Wait 10 minutes
- [ ] Sync button re-enables

---

## 🔧 Configuration

### **Rate Limits** (`lib/security/rate-limiter.ts`)

```typescript
GMB_SYNC: {
  maxRequests: 10,
  windowMs: 600000, // 10 minutes
},
GMB_SYNC_PROGRESS: {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
},
```

### **SSE vs Polling** (`hooks/use-sync-progress.ts`)

- Primary: Server-Sent Events (SSE) via `/api/sync/progress`
- Fallback: Polling every 5 seconds
- Auto-reconnect on SSE disconnection (5s delay)

### **First-Sync Detection** (`contexts/SyncContext.tsx`)

```typescript
// Checks if user has any completed sync jobs
const { data: completedJobs } = await supabase
  .from('sync_queue')
  .select('id')
  .eq('user_id', userId)
  .eq('status', 'completed')
  .limit(1)

const isFirstSync = !completedJobs || completedJobs.length === 0
```

---

## 🐛 Known Issues & Limitations

### **1. Posts & Media Not in Sync-v2**

- **Issue**: `gmb-sync-v2` only syncs locations, reviews, questions
- **Workaround**: Posts/media use legacy sync
- **Fix**: Add posts/media stages to `gmb-sync-v2.ts`

### **2. SSE Multi-Instance Limitation**

- **Issue**: In-memory pub/sub doesn't work across Vercel serverless instances
- **Impact**: Progress updates may not work in multi-instance deployments
- **Workaround**: Polling fallback is automatic
- **Fix**: Use Supabase Realtime or Redis pub/sub

### **3. First-Sync Detection Edge Case**

- **Issue**: If `is_initial_sync_done` is set immediately in OAuth callback, overlay may not trigger
- **Current Fix**: Check `sync_queue` history instead of flag
- **Monitor**: Verify in production that first-sync overlay shows consistently

### **4. Cancel Functionality Not Implemented**

- **Issue**: Sync progress modal shows cancel button but it's disabled
- **Fix**: Add `/api/gmb/sync/cancel` endpoint

---

## 🎯 Future Enhancements

### **Phase 2: Background Auto-Sync**

```tsx
// Auto-sync every 30 minutes
function useBackgroundSync(intervalMinutes: number = 30) {
  const { triggerSync, status } = useSync()

  useEffect(() => {
    const shouldSync = () => {
      if (!status.lastSync) return true
      const minutesSinceLastSync = (Date.now() - status.lastSync.getTime()) / 1000 / 60
      return minutesSinceLastSync > intervalMinutes
    }

    const interval = setInterval(
      () => {
        if (shouldSync() && !status.isSyncing) {
          triggerSync()
        }
      },
      intervalMinutes * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [triggerSync, status, intervalMinutes])
}
```

### **Phase 3: Webhook Integration**

- Real-time sync via GMB webhooks
- Push-based updates instead of polling
- Instant notification of new reviews/questions

### **Phase 4: Selective Sync**

```tsx
<SyncOptions>
  <Checkbox checked>Locations</Checkbox>
  <Checkbox checked>Reviews</Checkbox>
  <Checkbox>Questions</Checkbox>
  <Checkbox>Posts</Checkbox>
  <Button>Sync Selected</Button>
</SyncOptions>
```

### **Phase 5: Sync History**

- Page showing last 10 syncs
- Success/failure rates
- Average duration
- Data counts per sync

---

## 📝 Migration Notes

### **Removed Components**

The following individual sync buttons should be removed from pages:

- Dashboard: Remove standalone sync button (now in header)
- Reviews page: Remove sync button
- Questions page: Remove sync button
- Locations page: Remove bulk sync button (keep location-specific sync)

### **Keep Existing**

- `GMBConnectionManager`: Keep for settings page (connect/disconnect flows)
- `SyncProgressModal`: Keep for backward compatibility (can be removed later)

---

## 🙏 Credits

Implemented following the plan in `/docs/GLOBAL_SYNC_PLAN.md` (now this file).

---

## 📞 Support

For issues or questions:

1. Check `hooks/use-sync-progress.ts` for SSE/polling logic
2. Check `server/actions/gmb-sync-v2.ts` for sync execution
3. Check `lib/cache/cache-manager.ts` for progress publishing
4. Review `sync_queue` table for job history

---

**Status**: ✅ Phase 1 Complete (Core Implementation)
