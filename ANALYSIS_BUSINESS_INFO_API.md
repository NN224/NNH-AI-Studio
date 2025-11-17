# تحليل استخدام Google Business Information API

## المشاكل المكتشفة:

### 1. Profile Object يحتوي فقط على `description`
من API Documentation:
```json
"Profile": {
  "properties": {
    "description": {
      "description": "Required. Description of the location in your own voice, not editable by anyone else.",
      "type": "string"
    }
  }
}
```

**المشكلة**: الكود يحاول جلب `profileData.specialLinks`, `profileData.attributes`, `profileData.fromTheBusiness` - هذه الحقول **غير موجودة** في `Profile` object!

### 2. Attributes موجودة في endpoint منفصل
- **Endpoint**: `GET /v1/locations/{location_id}/attributes`
- **لا يتم جلبها** في `fetchLocations` - يجب استدعاؤها بشكل منفصل لكل location

### 3. Special Links غير موجودة في API Documentation
- `menuLink`, `reservationUri`, `orderLink`, `appointmentLink` **غير موجودة** في API Documentation
- قد تكون deprecated أو موجودة في مكان آخر (مثل `moreHours` أو `serviceItems`)

### 4. readMask الحالي صحيح لكن غير كامل
```typescript
'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels'
```

**المشكلة**: `profile` يحتوي فقط على `description` - لا يحتوي على `attributes` أو `specialLinks`.

---

## الحلول المطلوبة:

### 1. إضافة استدعاء منفصل لـ Attributes
```typescript
// بعد fetchLocations، لكل location:
const attributesUrl = `${GBP_LOC_BASE}/${location.name}/attributes`;
const attributesResponse = await fetch(attributesUrl, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const attributes = await attributesResponse.json();
```

### 2. إزالة specialLinks من profile extraction
- `specialLinks` غير موجودة في API - يجب إزالتها من الكود أو البحث عنها في مكان آخر

### 3. تحديث normalizeBusinessProfile
- استخدام `attributes` من endpoint منفصل
- إزالة `specialLinks` من `profileData`
- البحث عن special links في `moreHours` أو `serviceItems` إذا كانت موجودة

---

## الحقول المتاحة في Location Object:

✅ **موجودة**:
- `name` - Location ID
- `title` - Location name
- `storefrontAddress` - Address
- `phoneNumbers` - Phone numbers
- `websiteUri` - Website URL
- `categories` - Primary and additional categories
- `profile.description` - Business description
- `regularHours` - Business hours
- `specialHours` - Special hours
- `moreHours` - More hours types
- `serviceItems` - Services offered
- `openInfo` - Opening status and date
- `metadata` - Read-only metadata (rating, review count, etc.)
- `latlng` - Coordinates
- `labels` - Custom labels

❌ **غير موجودة في Location**:
- `profile.attributes` - يجب استدعاؤها من endpoint منفصل
- `profile.specialLinks` - غير موجودة في API
- `profile.fromTheBusiness` - غير موجودة في API

---

## الخطوات التالية:

1. ✅ فحص API Documentation
2. ⏳ إضافة fetchAttributes function
3. ⏳ تحديث sync logic لاستدعاء attributes لكل location
4. ⏳ تحديث normalizeBusinessProfile
5. ⏳ إزالة specialLinks من profile extraction
6. ⏳ اختبار التغييرات

