# Posts Module - Fixes & Testing Documentation

## Overview
This document details all fixes applied to the Posts Module and provides test cases to verify functionality.

## Date: 2025-11-10
**Status:** ✅ All Priority Tasks Completed

---

## Fixes Implemented

### 1. ✅ Post Creation Form Validation
**Location:** `components/posts/post-form-validation.ts`

#### Changes Made:
- **Enhanced CTA Validation:** The CALL action type no longer requires a URL, as it's designed to initiate a phone call directly
- **Improved URL Validation:** Better regex pattern (`^https?:\/\/.+`) to ensure valid URLs
- **Schedule Date Validation:** Added validation to ensure scheduled dates are in the future
- **Description Length Validation:** Enforced 1500 character limit with clear error messages

#### Code Changes:
```typescript
// Before: CALL required URL (incorrect)
if (data.cta && !data.ctaUrl) {
  return { isValid: false, error: 'Please provide a URL for your call-to-action' };
}

// After: CALL doesn't require URL
if (data.cta && data.cta !== 'CALL' && !data.ctaUrl) {
  return { isValid: false, error: 'Please provide a URL for your call-to-action' };
}

// New: Schedule validation
if (data.scheduledAt) {
  const scheduledDate = new Date(data.scheduledAt);
  const now = new Date();
  if (scheduledDate <= now) {
    return { isValid: false, error: 'Scheduled time must be in the future' };
  }
}
```

---

### 2. ✅ Media Upload to Supabase Storage
**Locations:** 
- `components/posts/create-post-dialog.tsx`
- `components/posts/edit-post-dialog.tsx`

#### Changes Made:
- **File Picker Integration:** Added hidden file input with button trigger
- **File Type Validation:** Only accepts JPG, PNG, GIF, WebP images (max 10MB)
- **Upload Progress:** Shows loading state during upload
- **Visual Preview:** Displays uploaded image with file name and URL
- **Remove Functionality:** Users can remove uploaded media and start over
- **Fallback URL Input:** Users can still enter a URL manually if preferred
- **Location Requirement:** Must select a location before uploading

#### Features Added:
```typescript
// File upload handler
const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  // Validate type and size
  // Upload to /api/upload/image
  // Set mediaUrl on success
}, [locationId]);

// Visual preview with remove option
{mediaUrl && (
  <div className="relative border border-zinc-700 rounded-lg p-4 bg-zinc-800">
    <ImageIcon />
    <p>{uploadedFile?.name || 'Media URL'}</p>
    <Button onClick={handleRemoveMedia}>
      <X className="w-4 h-4" />
    </Button>
  </div>
)}
```

#### UI Improvements:
- Upload button with icon and loading state
- Warning text when location not selected
- Helper text explaining file requirements
- Image preview with fallback for invalid URLs
- Clean remove button for uploaded media

---

### 3. ✅ Post Scheduling Functionality
**Locations:** 
- `components/posts/create-post-dialog.tsx`
- `components/posts/edit-post-dialog.tsx`
- `components/posts/post-form-validation.ts`

#### Changes Made:
- **Min Date Attribute:** Added `min={new Date().toISOString().slice(0, 16)}` to prevent past dates
- **Helper Text:** Added explanation that scheduled posts are saved as queued
- **Validation:** Enforces future dates in the validation layer
- **Status Handling:** Posts with scheduled dates automatically get 'queued' status

#### Server-side Logic (Already in Place):
```typescript
// In server/actions/posts-management.ts
if (validatedData.scheduledAt) {
  // Save as queued without publishing to Google
  await supabase.from("gmb_posts").insert({
    // ... other fields
    scheduled_at: validatedData.scheduledAt,
    status: "queued",  // Automatically set to queued
  })
  return createSuccessResponse("Post scheduled successfully");
}
```

---

### 4. ✅ CTA (Call-to-Action) Buttons
**Locations:**
- `components/posts/create-post-dialog.tsx`
- `components/posts/edit-post-dialog.tsx`
- `components/posts/post-form-validation.ts`

#### Changes Made:
- **CALL Action Fix:** Disabled URL input when CALL is selected
- **Conditional Validation:** URL only required for non-CALL actions
- **UI State Management:** URL field shows as disabled when CALL is selected or no CTA chosen

#### Available CTA Options:
- BOOK - Requires URL
- ORDER - Requires URL
- LEARN_MORE - Requires URL
- SIGN_UP - Requires URL
- CALL - No URL required ✨
- SHOP - Requires URL

#### Code Implementation:
```typescript
// In create-post-dialog.tsx
<Input
  id="url"
  value={ctaUrl}
  onChange={(e) => setCtaUrl(e.target.value)}
  placeholder="https://example.com"
  disabled={!cta || cta === 'CALL'}  // Disabled for CALL
/>
```

---

### 5. ✅ Draft/Published Status Management
**Location:** `server/actions/posts-management.ts`

#### Status Flow:
1. **Draft** - Post created without scheduling, not published
2. **Queued** - Post scheduled for future publication
3. **Published** - Post successfully published to Google Business Profile
4. **Failed** - Post publication failed (error handling)

#### Existing Logic (Verified Working):
```typescript
// Create post
status: validated.scheduledAt ? 'queued' : 'draft'

// After successful publish
status: 'published'
published_at: new Date().toISOString()
```

---

### 6. ✅ Post Deletion and Archiving
**Location:** `server/actions/posts-management.ts`

#### New Features Added:
- **Archive Function:** Soft delete by setting metadata flag
- **Bulk Archive:** Archive multiple posts at once
- **Existing Delete:** Hard delete from database and Google (verified working)

#### Archive Implementation:
```typescript
export async function archivePost(postId: string) {
  await supabase
    .from("gmb_posts")
    .update({
      status: "draft",
      metadata: {
        ...post.metadata,
        archived: true,
        archivedAt: new Date().toISOString(),
      },
    })
    .eq("id", postId)
}

export async function bulkArchivePosts(postIds: string[]) {
  // Archives multiple posts
}
```

#### Delete vs Archive:
- **Delete:** Permanently removes from database and Google Business Profile
- **Archive:** Marks as archived in metadata, sets status to draft, keeps in database

---

## Testing Checklist

### Test Case 1: Create Post with All Fields
- [ ] Navigate to Posts page
- [ ] Click "Create Post" button
- [ ] Select a location from dropdown
- [ ] Select post type (What's New, Event, Offer)
- [ ] Enter title (optional)
- [ ] Enter description (required, max 1500 chars)
- [ ] Upload an image via file picker
- [ ] Select CTA button (try each type)
- [ ] Enter CTA URL (except for CALL)
- [ ] Schedule for future date
- [ ] Click "Create Post"
- [ ] Verify post appears in list with "queued" status

### Test Case 2: Media Upload
- [ ] Open create post dialog
- [ ] Try uploading without selecting location (should show error)
- [ ] Select a location
- [ ] Click "Upload Image" button
- [ ] Select a valid image file (JPG/PNG/GIF/WebP under 10MB)
- [ ] Verify upload progress indicator
- [ ] Verify image preview appears
- [ ] Verify remove button works
- [ ] Try uploading invalid file type (should show error)
- [ ] Try uploading file over 10MB (should show error)

### Test Case 3: Form Validation
- [ ] Try creating post without location (should show error)
- [ ] Try creating post without description (should show error)
- [ ] Enter description over 1500 characters (should show error)
- [ ] Select CTA with URL requirement, leave URL empty (should show error)
- [ ] Select CALL CTA (should not require URL)
- [ ] Enter invalid URL format (should show error)
- [ ] Try scheduling in the past (should show error via HTML5 min attribute)

### Test Case 4: Post Scheduling
- [ ] Create post with future schedule date
- [ ] Verify post status is "queued"
- [ ] Verify scheduled time is displayed correctly
- [ ] Edit scheduled post
- [ ] Change schedule time
- [ ] Verify updated schedule is saved

### Test Case 5: CTA Functionality
- [ ] Test each CTA type:
  - BOOK with URL
  - ORDER with URL
  - LEARN_MORE with URL
  - SIGN_UP with URL
  - CALL without URL ✨
  - SHOP with URL
- [ ] Verify URL field is disabled for CALL
- [ ] Verify URL field is enabled for others
- [ ] Verify validation works correctly for each

### Test Case 6: Edit Post
- [ ] Open existing draft post
- [ ] Modify all fields
- [ ] Upload new media
- [ ] Change CTA settings
- [ ] Update schedule
- [ ] Save changes
- [ ] Verify changes are persisted

### Test Case 7: Delete vs Archive
- [ ] Create a test post
- [ ] Archive the post (if UI available)
- [ ] Verify post is marked as archived
- [ ] Delete a test post
- [ ] Verify post is removed from list
- [ ] Verify confirmation dialog appears

### Test Case 8: Publish Workflow
- [ ] Create draft post
- [ ] Publish immediately (no schedule)
- [ ] Verify status changes to "published"
- [ ] Verify published_at timestamp is set
- [ ] Check Google Business Profile to confirm post appears

### Test Case 9: AI Generation
- [ ] Enter some basic text
- [ ] Click "AI Generate" button
- [ ] Verify generated content appears
- [ ] Verify content can be edited
- [ ] Create post with AI-generated content

### Test Case 10: Bulk Operations
- [ ] Select multiple posts
- [ ] Test bulk publish (for draft posts)
- [ ] Test bulk delete
- [ ] Verify operation confirmation
- [ ] Verify success/error feedback

---

## Sample Test Posts

### Test Post 1: Simple Post
```
Location: [Any Active Location]
Type: What's New
Title: "New Menu Items Available"
Description: "Try our delicious new seasonal menu items! Available now for a limited time."
Media: None
CTA: None
Schedule: None
Expected Result: Draft post created
```

### Test Post 2: Post with Media
```
Location: [Any Active Location]
Type: What's New
Title: "Check Out Our New Look"
Description: "We've renovated! Come visit us and see our beautiful new space."
Media: [Upload image]
CTA: LEARN_MORE with URL
Schedule: None
Expected Result: Draft post created with image
```

### Test Post 3: Scheduled Post
```
Location: [Any Active Location]
Type: Event
Title: "Grand Opening Celebration"
Description: "Join us for our grand opening celebration this weekend! Special offers and prizes."
Media: [Upload image]
CTA: BOOK with URL
Schedule: [Future date/time]
Expected Result: Queued post created
```

### Test Post 4: Call CTA Post
```
Location: [Any Active Location]
Type: What's New
Title: "Call Us for Reservations"
Description: "Book your table now! Call us directly to make a reservation for tonight."
Media: None
CTA: CALL (no URL)
Schedule: None
Expected Result: Draft post created with CALL CTA and no URL
```

### Test Post 5: Published Post
```
Location: [Any Active Location]
Type: What's New
Title: "We're Open!"
Description: "Visit us today and experience our excellent service and quality products."
Media: [Upload image]
CTA: SHOP with URL
Schedule: None
Action: Create then immediately publish
Expected Result: Published post on Google Business Profile
```

---

## Known Limitations

1. **Event and Offer Posts:** Currently can only be saved as drafts according to the note in the UI. Google Business Profile API only supports "What's New" posts for direct publishing.

2. **Scheduled Publishing:** Scheduled posts are saved with 'queued' status but require a separate scheduler service to actually publish them at the scheduled time (not implemented in this PR).

3. **Media Storage:** Uploaded media is stored in Supabase storage bucket 'gmb-media'. Ensure bucket exists and has proper permissions.

4. **Google API Limitations:** Some post operations depend on valid Google account connections and appropriate permissions.

---

## Build Status

✅ **Build Successful**
- All TypeScript compilation passed
- No syntax errors
- Linting warnings are pre-existing and unrelated to changes

---

## Files Modified

1. `components/posts/create-post-dialog.tsx` - Added media upload, improved validation
2. `components/posts/edit-post-dialog.tsx` - Added media upload, improved validation
3. `components/posts/post-form-validation.ts` - Enhanced validation logic
4. `server/actions/posts-management.ts` - Added archive functionality

---

## Conclusion

All priority tasks have been completed successfully:
- ✅ Form validation fixed and enhanced
- ✅ Media upload functionality integrated
- ✅ Scheduling functionality improved
- ✅ CTA buttons fixed (especially CALL action)
- ✅ Draft/published status logic verified
- ✅ Delete and archive functionality implemented

The Posts module is now fully functional and ready for testing with actual Google Business Profile locations.

---

## Next Steps (Recommendations)

1. **Implement Scheduled Post Publisher:** Create a cron job or scheduled task to publish posts at their scheduled times
2. **Add Post Analytics:** Track views, clicks, and engagement metrics
3. **Bulk Edit:** Add ability to edit multiple posts at once
4. **Post Templates:** Create reusable post templates
5. **Media Library:** Create a media library for reusing uploaded images
6. **Post Insights:** Display Google Business Profile insights for published posts
