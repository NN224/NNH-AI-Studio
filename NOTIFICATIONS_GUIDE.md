# 🔔 Notifications System Guide

## ✅ What's Implemented:

### 1. **Database Table** (`notifications`)
- Stores user notifications
- Types: `review`, `sync`, `error`, `info`, `success`, `warning`
- Supports links to navigate
- Read/unread status

### 2. **API Routes:**
- `GET /api/notifications` - List notifications
- `POST /api/notifications` - Mark as read / Mark all as read
- `DELETE /api/notifications` - Delete notification
- `POST /api/notifications/create` - Create notification (admin/internal use)

### 3. **UI Component:**
- Notification bell in Header
- Badge with unread count
- Popover dropdown with notifications list
- Mark as read / Delete actions
- Auto-refresh every 30 seconds

---

## 📝 How to Create Notifications:

### From Server-Side (API Routes):

```typescript
// Example: When a new review arrives
import { createAdminClient } from '@/lib/supabase/server'

const admin = createAdminClient()
await admin.from('notifications').insert({
  user_id: userId,
  type: 'review',
  title: 'New Review',
  message: 'You have a new 5-star review from John Doe',
  link: '/gmb-dashboard',
  metadata: { review_id: '123', location_id: '456' }
})
```

### From Client-Side:

```typescript
// Example: After publishing a post
await fetch('/api/notifications/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'success',
    title: 'Post Published',
    message: 'Your GMB post has been published successfully',
    link: '/gmb-posts'
  })
})
```

---

## 🎯 Suggested Integration Points:

### 1. **New Review Notification:**
- When syncing GMB reviews, create notification for new reviews
- Location: `app/api/gmb/sync/route.ts`

### 2. **Sync Status:**
- Success: "Sync completed - 15 new reviews"
- Error: "Sync failed - check your connection"

### 3. **Post Publishing:**
- Success: "Your post has been published"
- Error: "Failed to publish post"

### 4. **YouTube Actions:**
- Video uploaded successfully
- New comment on video
- Channel stats updated

---

## 🔧 Example: Add Notification on Review Sync

In `app/api/gmb/sync/route.ts`, add:

```typescript
// After syncing reviews
const newReviewsCount = // count new reviews
if (newReviewsCount > 0) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    user_id: userId,
    type: 'review',
    title: 'New Reviews Available',
    message: `${newReviewsCount} new review${newReviewsCount > 1 ? 's' : ''} received`,
    link: '/gmb-dashboard',
    metadata: { review_count: newReviewsCount }
  })
}
```

---

## ✅ Migration Required:

Run the SQL migration:
```sql
-- File: supabase/migrations/20250102_notifications.sql
```

---

## 🎨 Features:

- ✅ Real-time badge count
- ✅ Unread/read status
- ✅ Click to view details (with links)
- ✅ Mark as read / Delete
- ✅ Auto-refresh every 30 seconds
- ✅ Different icons per type
- ✅ Empty state message

---

**Ready to use!** Just add notification creation calls in your API routes where needed.

