# 🧪 دليل اختبار Google Business Information API

## الطرق المتاحة للاختبار

### 1️⃣ **API Endpoint للاختبار** (أسهل طريقة)

افتح في المتصفح أو استخدم curl:

```bash
# اختبار مباشر (يتطلب تسجيل دخول)
curl http://localhost:3000/api/gmb/test-attributes?locationId=YOUR_LOCATION_ID

# أو باستخدام location resource مباشرة
curl http://localhost:3000/api/gmb/test-attributes?locationResource=locations/11247391224469965786
```

### 2️⃣ **استخدام MCP Supabase للحصول على Token**

```sql
-- الحصول على token للاختبار
SELECT 
  l.location_id,
  LEFT(a.access_token, 30) || '...' as token_preview,
  a.token_expires_at
FROM gmb_locations l
JOIN gmb_accounts a ON a.id = l.gmb_account_id
WHERE a.is_active = true
LIMIT 1;
```

### 3️⃣ **استخدام Script Node.js**

```bash
# Set access token
export GOOGLE_ACCESS_TOKEN="ya29.xxxxx"

# Run test
node scripts/test_attributes_api.js locations/11247391224469965786
```

### 4️⃣ **استخدام Bash Script**

```bash
# Set access token
export GOOGLE_ACCESS_TOKEN="ya29.xxxxx"

# Run test
./scripts/test_google_api.sh locations/11247391224469965786
```

## 🔍 Endpoints المختبرة

1. **GET `/locations/{locationId}/attributes`**
   - يعيد attributes المحددة للـ location
   - ✅ هذا هو Endpoint الصحيح

2. **GET `/locations/{locationId}/attributes?readMask=...`**
   - يعيد attributes مع readMask محدد

## 📝 ملاحظات

- Google API **لا يدعم** endpoint عام مثل `/attributes` أو `/attributes:batchGet`
- يجب استخدام location resource محدد: `/locations/{locationId}/attributes`
- جميع attributes مرتبطة بـ location محدد

## 🐛 استكشاف الأخطاء

### خطأ 404:
- ✅ **تم الإصلاح**: استبدال `/attributes:batchGet` بـ `/locations/{locationId}/attributes`

### خطأ 401 (Unauthorized):
- تحقق من أن access token صحيح
- تحقق من أن token لم ينتهِ
- استخدم refresh token لتحديثه

### خطأ 403 (Forbidden):
- تحقق من أن location يتبع account نشط
- تحقق من الأذونات في Google Cloud Console

## 🔗 روابط مفيدة

- [Google Business Information API Docs](https://developers.google.com/my-business/content/basic-information)
- [Attributes API Reference](https://developers.google.com/my-business/content/attributes)

