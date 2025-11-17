# 🔧 **إصلاح General Settings**

---

## 🔴 **المشاكل:**

### **1. Business Name vs Account Name:**
```
❌ حالياً: "Business Name" (مربك)
✅ المفروض: "Business Display Name" أو "Location Name"
```

### **2. معلومات غير ضرورية:**
```
❌ Primary Category
❌ Business Description
❌ Default Reply Template
```

**هذه معلومات تجي من GMB مباشرة!**

---

## ✅ **الحل:**

### **General Settings يحتوي فقط على:**

```typescript
// 1. Sync Settings
- Auto Sync: ON/OFF
- Sync Schedule: Daily/Weekly/Manual

// 2. App Preferences
- Language: English/Arabic
- Timezone: Auto/Manual
- Theme: Light/Dark

// 3. Default Settings
- Default View: Dashboard/Reviews/Locations
- Notifications: ON/OFF
```

---

## 🖼️ **حل مشكلة الصور:**

### **في General Settings:**
```typescript
// Upload Logo & Cover
const logoUrl = await uploadToSupabase(logoFile)
const coverUrl = await uploadToSupabase(coverFile)

// Save to user profile
await supabase
  .from('profiles')
  .update({
    logo_url: logoUrl,
    cover_image_url: coverUrl
  })
  .eq('id', userId)
```

### **في Brand Tab:**
```typescript
// Fetch from profile
const { data: profile } = await supabase
  .from('profiles')
  .select('logo_url, cover_image_url')
  .eq('id', userId)
  .single()

// Use in branding
setLogoUrl(profile.logo_url)
setCoverImageUrl(profile.cover_image_url)
```

---

## 📋 **البساطة المطلوبة:**

### **Tab 1: GMB Connection**
```
✅ Connect/Disconnect
✅ Sync Status
✅ Last Sync Time
```

### **Tab 2: Business Profile**
```
✅ Logo Upload
✅ Cover Upload
✅ Brand Colors
✅ Display Settings
```

### **Tab 3: App Settings**
```
✅ Language
✅ Theme
✅ Notifications
✅ Default Views
```

---

## 🎯 **الهدف:**

```
بساطة + وضوح + عدم التكرار
```
