# 🔧 إصلاح مشكلة Logo & Cover ما عم ينجلبو

## 📊 **المشكلة المكتشفة**

```
❌ Logo & Cover ما عم ينجلبو من GMB
❌ الصور موجودة في GMB لكن ما عم تنحفظ في DB
```

---

## 🔍 **التحليل**

### **1. Cover Photo - يتم جلبه جزئياً** ⚠️

```typescript
// app/api/gmb/sync/route.ts (السطور 1343-1369)
// ✅ يتم جلب cover photo أثناء locations sync
for (const loc of locations) {
  const locationId = loc.name.split('/').pop();
  const mediaUrl = `${GMB_V4_BASE}/${accountResource}/locations/${locationId}/media`;
  let coverPhotoUrl = null;

  try {
    const res = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      const mediaItems = Array.isArray(data.mediaItems) ? data.mediaItems : [];
      const cover = mediaItems.find(
        (item) => item.mediaFormat === 'COVER'  // ✅ يبحث عن COVER
      );
      coverPhotoUrl = cover?.googleUrl || null;
    }
  } catch (err) {
    console.error(`Error fetching cover photo:`, err);
  }

  // ✅ يحفظ cover_photo_url في location object
  loc.cover_photo_url = coverPhotoUrl;
}
```

**النتيجة:** ✅ Cover photo يتم جلبه وحفظه في `cover_photo_url`

---

### **2. Logo - لا يتم جلبه** ❌

```typescript
// ❌ لا يوجد كود لجلب LOGO أثناء sync
// فقط COVER يتم جلبه
```

**المشكلة:**
- الكود يجلب فقط `COVER` photo
- لا يجلب `LOGO` photo
- `logo_url` يبقى `NULL` في DB

---

### **3. Media Sync - يحفظ كل الصور لكن بدون category** ⚠️

```typescript
// app/api/gmb/sync/route.ts (السطور 1706-1733)
const mediaRows = media.map((item) => {
  return {
    gmb_account_id: accountId,
    location_id: location.id,
    user_id: userId,
    external_media_id: item.name || item.mediaId || null,
    type: item.mediaFormat || item.type || null,  // ⚠️ type فقط
    url: item.googleUrl || item.sourceUrl || null,
    thumbnail_url: item.thumbnailUrl || null,
    created_at: item.createTime || null,
    updated_at: item.updateTime || null,
    metadata: item,  // ✅ يحفظ كل البيانات في metadata
  };
});
```

**المشكلة:**
- `type` يحفظ `mediaFormat` (مثل PHOTO, VIDEO)
- لكن `category` (LOGO, COVER, PROFILE) لا يتم حفظه في حقل منفصل
- `category` موجود في `metadata` لكن صعب الوصول إليه

---

## ✅ **الحل**

### **الخيار 1: إضافة Logo إلى Locations Sync** 🔴 (الأفضل)

```typescript
// app/api/gmb/sync/route.ts (بعد السطر 1359)
const cover = mediaItems.find(
  (item) => item.mediaFormat === 'COVER'
);
coverPhotoUrl = cover?.googleUrl || null;

// ✅ إضافة: جلب LOGO أيضاً
const logo = mediaItems.find(
  (item) => item.mediaFormat === 'LOGO'
);
const logoUrl = logo?.googleUrl || null;

// ✅ حفظ logo_url في location object
loc.cover_photo_url = coverPhotoUrl;
loc.logo_url = logoUrl;  // ✅ جديد
```

**ثم في السطر 1488:**
```typescript
return {
  // ... existing fields
  cover_photo_url: location.cover_photo_url || null,
  logo_url: location.logo_url || null,  // ✅ جديد
  // ... rest
};
```

---

### **الخيار 2: إضافة category إلى Media Table** 🟡

```sql
-- إضافة عمود category إلى gmb_media
ALTER TABLE gmb_media ADD COLUMN IF NOT EXISTS category TEXT;

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_gmb_media_category ON gmb_media(category);
```

```typescript
// app/api/gmb/sync/route.ts (السطر 1722)
return {
  gmb_account_id: accountId,
  location_id: location.id,
  user_id: userId,
  external_media_id: item.name || item.mediaId || null,
  type: item.mediaFormat || item.type || null,
  category: item.locationAssociation?.category || null,  // ✅ جديد
  url: item.googleUrl || item.sourceUrl || null,
  thumbnail_url: item.thumbnailUrl || null,
  created_at: item.createTime || null,
  updated_at: item.updateTime || null,
  metadata: item,
};
```

---

## 🚀 **التطبيق الموصى به**

### **الخطوة 1: تحديث Database Schema**

```sql
-- supabase/migrations/20251116_add_logo_and_category.sql

-- 1. إضافة logo_url إلى gmb_locations
ALTER TABLE gmb_locations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. إضافة category إلى gmb_media
ALTER TABLE gmb_media 
ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_gmb_media_category 
ON gmb_media(category);

-- 4. Index للبحث عن LOGO و COVER
CREATE INDEX IF NOT EXISTS idx_gmb_media_location_category 
ON gmb_media(location_id, category);

COMMENT ON COLUMN gmb_locations.logo_url IS 'Direct URL to location logo from GMB';
COMMENT ON COLUMN gmb_media.category IS 'Media category: LOGO, COVER, PROFILE, ADDITIONAL, etc.';
```

---

### **الخطوة 2: تحديث Sync Code**

```typescript
// app/api/gmb/sync/route.ts

// A. في locations sync (السطر 1356-1369):
const cover = mediaItems.find(
  (item) => item.mediaFormat === 'COVER'
);
const logo = mediaItems.find(
  (item) => item.mediaFormat === 'LOGO'  // ✅ جديد
);

coverPhotoUrl = cover?.googleUrl || null;
const logoUrl = logo?.googleUrl || null;  // ✅ جديد

loc.cover_photo_url = coverPhotoUrl;
loc.logo_url = logoUrl;  // ✅ جديد

// B. في location insert (السطر 1488):
cover_photo_url: location.cover_photo_url || null,
logo_url: location.logo_url || null,  // ✅ جديد

// C. في media sync (السطر 1722):
return {
  gmb_account_id: accountId,
  location_id: location.id,
  user_id: userId,
  external_media_id: item.name || item.mediaId || null,
  type: item.mediaFormat || item.type || null,
  category: item.locationAssociation?.category || null,  // ✅ جديد
  url: item.googleUrl || item.sourceUrl || null,
  thumbnail_url: item.thumbnailUrl || null,
  created_at: item.createTime || null,
  updated_at: item.updateTime || null,
  metadata: item,
};
```

---

### **الخطوة 3: تحديث Types**

```typescript
// lib/types/database.ts
export interface GMBLocation {
  // ... existing fields
  cover_photo_url?: string | null;
  logo_url?: string | null;  // ✅ جديد
  // ... rest
}

export interface GMBMedia {
  // ... existing fields
  type?: string | null;
  category?: string | null;  // ✅ جديد
  // ... rest
}
```

---

## 📊 **قبل وبعد**

### **قبل الإصلاح:**
```json
{
  "cover_photo_url": "https://...",  // ✅ موجود
  "logo_url": null                   // ❌ مفقود
}
```

```sql
-- gmb_media
SELECT type, category FROM gmb_media;
-- type: "PHOTO", category: NULL  ❌
```

### **بعد الإصلاح:**
```json
{
  "cover_photo_url": "https://...",  // ✅ موجود
  "logo_url": "https://..."          // ✅ موجود
}
```

```sql
-- gmb_media
SELECT type, category FROM gmb_media;
-- type: "PHOTO", category: "LOGO"  ✅
-- type: "PHOTO", category: "COVER" ✅
```

---

## ✅ **الخلاصة**

```
❌ المشكلة: Logo لا يتم جلبه، Category لا يتم حفظه
✅ الحل: 
   1. إضافة logo_url إلى gmb_locations
   2. إضافة category إلى gmb_media
   3. تحديث sync code لجلب LOGO
   4. تحديث sync code لحفظ category
```

---

## 🎯 **الملفات المطلوب تعديلها**

1. ✅ `supabase/migrations/20251116_add_logo_and_category.sql` (جديد)
2. ✅ `app/api/gmb/sync/route.ts` (3 تعديلات)
3. ✅ `lib/types/database.ts` (تحديث types)

---

**هل تريد تطبيق الإصلاح الآن؟** 🚀

