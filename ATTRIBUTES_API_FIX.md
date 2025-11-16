# إصلاح Attributes API - استخدام الـ Endpoint الصحيح

## المشكلة

كان الكود يستخدم endpoint خاطئ لجلب attributes:
- **الخطأ**: `GET /v1/categories/{categoryName}` مع `readMask=attributeDefinitions`
- **الصحيح**: `GET /v1/attributes` حسب Google Business Profile API v1 Schema

## التغييرات

### الملف المُعدّل
`/app/api/gmb/attributes/route.ts`

### ما تم تصحيحه

#### 1. الـ Endpoint
```typescript
// قبل (خطأ ❌)
const url = new URL(`${BUSINESS_INFORMATION_BASE}/categories/${categoryName}`)
url.searchParams.set("readMask", "attributeDefinitions")

// بعد (صحيح ✅)
const url = new URL(`${BUSINESS_INFORMATION_BASE}/attributes`)
```

#### 2. Parameters الصحيحة
الآن ندعم 3 طرق لجلب الـ attributes:

**Option 1: حسب Location محدد**
```typescript
GET /v1/attributes?parent=locations/{location_id}
```

**Option 2: حسب Category**
```typescript
GET /v1/attributes?categoryName=categories/{category_id}&regionCode=US&languageCode=en
```

**Option 3: جميع الـ Attributes**
```typescript
GET /v1/attributes?showAll=true&regionCode=US&languageCode=en
```

#### 3. الـ Response Format
```typescript
// قبل (خطأ ❌)
{
  attributeDefinitions: [...],
  category: "...",
  ...
}

// بعد (صحيح ✅)
{
  attributeMetadata: [...],
  nextPageToken: "...",
  totalCount: 123
}
```

#### 4. Pagination Support
الآن ندعم pagination بشكل صحيح:
```typescript
url.searchParams.set("pageSize", "200")
if (pageToken) {
  url.searchParams.set("pageToken", pageToken)
}
```

## الميزات الجديدة

### 1. دعم Location-Specific Attributes
```typescript
// مثال
GET /api/gmb/attributes?locationId=abc-123
```
يجلب الـ attributes المتاحة لموقع محدد.

### 2. دعم Category-Based Attributes
```typescript
// مثال
GET /api/gmb/attributes?categoryName=gcid:restaurant&regionCode=US&languageCode=en
```
يجلب الـ attributes المتاحة لفئة معينة.

### 3. دعم All Attributes
```typescript
// مثال
GET /api/gmb/attributes?showAll=true&regionCode=US&languageCode=en
```
يجلب جميع الـ attributes المتاحة.

### 4. Pagination
```typescript
// مثال
GET /api/gmb/attributes?categoryName=restaurant&pageSize=50&pageToken=xyz
```

## التوافق مع Google API Schema

### من الـ Schema الرسمي:
```json
{
  "path": "v1/attributes",
  "httpMethod": "GET",
  "parameters": {
    "parent": {
      "description": "Resource name of the location",
      "location": "query",
      "type": "string"
    },
    "categoryName": {
      "description": "The primary category stable ID",
      "location": "query",
      "type": "string"
    },
    "regionCode": {
      "description": "ISO 3166-1 alpha-2 country code",
      "location": "query",
      "type": "string"
    },
    "languageCode": {
      "description": "BCP 47 code of language",
      "location": "query",
      "type": "string"
    },
    "showAll": {
      "description": "Get all available attributes",
      "location": "query",
      "type": "boolean"
    },
    "pageSize": {
      "description": "Default is 200, minimum is 1",
      "location": "query",
      "type": "integer"
    },
    "pageToken": {
      "description": "For pagination",
      "location": "query",
      "type": "string"
    }
  },
  "response": {
    "$ref": "ListAttributeMetadataResponse"
  }
}
```

### الـ Response Schema:
```json
{
  "ListAttributeMetadataResponse": {
    "properties": {
      "attributeMetadata": {
        "type": "array",
        "items": {
          "$ref": "AttributeMetadata"
        }
      },
      "nextPageToken": {
        "type": "string"
      }
    }
  }
}
```

## الاستخدام في الكود

### في Component
```typescript
// components/locations/location-attributes-dialog.tsx

// Option 1: Get by location
const response = await fetch(`/api/gmb/attributes?locationId=${location.id}`)

// Option 2: Get by category
const response = await fetch(`/api/gmb/attributes?categoryName=${encodeURIComponent(location.category)}`)

// Option 3: Get all (fallback)
const response = await fetch(`/api/gmb/attributes?country=US`)
```

### الـ Response
```typescript
const data = await response.json()
const attributes = data.data?.attributeMetadata || data.attributeMetadata || []
```

## الفوائد

1. ✅ **متوافق مع Google API Schema الرسمي**
2. ✅ **يدعم Pagination**
3. ✅ **أكثر مرونة** (3 طرق للجلب)
4. ✅ **بيانات أكثر تفصيلاً** (attributeMetadata vs attributeDefinitions)
5. ✅ **أفضل Error Handling**
6. ✅ **Logging محسّن**

## Testing

### Test Cases

#### 1. Get attributes by location
```bash
curl -X GET "http://localhost:3000/api/gmb/attributes?locationId=abc-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Get attributes by category
```bash
curl -X GET "http://localhost:3000/api/gmb/attributes?categoryName=gcid:restaurant&regionCode=US&languageCode=en" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Get all attributes
```bash
curl -X GET "http://localhost:3000/api/gmb/attributes?showAll=true&regionCode=US&languageCode=en" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- الـ API الآن يطابق 100% مع Google Business Profile API v1 Schema
- تم إضافة logging لتسهيل الـ debugging
- تم تحسين Error handling
- الكود متوافق مع الـ components الموجودة (backward compatible)

## التاريخ
- **التاريخ**: 2024-11-16
- **المطور**: AI Assistant
- **السبب**: تصحيح استخدام خاطئ لـ API endpoint

