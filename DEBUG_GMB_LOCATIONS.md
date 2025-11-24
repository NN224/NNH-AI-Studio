# 🔍 Debug GMB Locations Issue

## المشكلة
```
Owner Diagnostics Results:
- accounts API: ✅ Working
- locations API: ❌ HTTP 404
- reviews/questions/posts/media: ❌ "Requested entity was not found"

Test Location ID: locations/16650162644297526889
Account ID: 516d75b1-6929-476b-abd4-f15bed8ac405
```

**الخلاصة:** Location ID غير موجود أو خطأ

---

## 🔧 خطوات الحل

### الخطوة 1: تحقق من GMB Dashboard مباشرة

1. افتح: https://business.google.com/
2. تسجيل دخول بنفس الحساب المربوط
3. **سؤال:** هل ترى business locations؟
   - [ ] نعم - كم عدد الـ locations؟ _____
   - [ ] لا - لازم تضيف location أولاً

**إذا لا يوجد locations:**
- أضف business location في GMB
- ثم ارجع للتطبيق وعمل Sync

---

### الخطوة 2: تحقق من الـ Database

افتح Supabase Dashboard أو استخدم SQL:

```sql
-- تحقق من GMB Accounts
SELECT id, user_id, account_name, is_active, last_sync, last_error
FROM gmb_accounts
WHERE id = '516d75b1-6929-476b-abd4-f15bed8ac405';

-- تحقق من Locations
SELECT id, location_id, name, address, is_verified
FROM gmb_locations
WHERE user_id = (SELECT user_id FROM gmb_accounts WHERE id = '516d75b1-6929-476b-abd4-f15bed8ac405');

-- تحقق من OAuth Tokens
SELECT id, provider, scope, expires_at
FROM oauth_tokens
WHERE user_id = (SELECT user_id FROM gmb_accounts WHERE id = '516d75b1-6929-476b-abd4-f15bed8ac405');
```

**ما تتوقع تشوف:**
- ✅ GMB Account موجود وactive
- ✅ OAuth token موجود وما منتهي
- ⚠️ GMB Locations: إذا فاضية أو قديمة = لازم sync

---

### الخطوة 3: أعد Sync مع Logging

روح على ملف الـ sync وشغّل مع logs:

```typescript
// server/actions/gmb-sync-v2.ts أو gmb-sync.ts
// تأكد الـ console.log شغال للـ debugging

// مثال:
console.log('[GMB Sync] Starting sync for account:', accountId);
console.log('[GMB Sync] OAuth token:', token ? 'exists' : 'missing');
console.log('[GMB Sync] Fetching locations...');
// ... etc
```

**ثم:**
1. روح `/en/settings` أو Dashboard
2. اضغط "Sync GMB Data"
3. افتح Browser DevTools → Console
4. شوف الـ logs - شو الخطأ بالضبط؟

---

### الخطوة 4: تحقق من GMB API Permissions

المشكلة المحتملة: OAuth scope ناقص

**الـ Scopes المطلوبة للـ GMB:**
```
https://www.googleapis.com/auth/business.manage
https://www.googleapis.com/auth/plus.business.manage (old, might still be needed)
```

**كيف تتحقق:**
1. افتح: https://myaccount.google.com/permissions
2. شوف "NNH AI Studio" أو اسم التطبيق
3. **تحقق:** هل الـ permissions تشمل GMB access؟

**إذا لا:**
- امسح الـ permission
- أعد OAuth connection
- تأكد من قبول كل الـ permissions

---

### الخطوة 5: تحقق من Location ID Format

**Location ID الصحيح:**
```
Format: accounts/{accountId}/locations/{locationId}
أو: locations/{locationId}
```

**من النتائج:**
```
"locations/16650162644297526889"
```

هذا format صحيح، لكن الـ ID نفسه ممكن خطأ.

**كيف تتحقق:**
```typescript
// في GMB sync code
const response = await fetch(
  `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const data = await response.json();
console.log('Available locations:', data.locations);
```

**ملاحظة:** إذا `data.locations` فاضية = ما في locations في الحساب

---

## 🎯 الحل السريع (Recommended)

### Option A: إذا عندك GMB Account مع Locations

```bash
1. Disconnect GMB Account
   - Settings → GMB → Disconnect

2. Re-connect GMB Account
   - Settings → GMB → Connect
   - Accept all permissions

3. Force Sync
   - Dashboard → Sync GMB Data
   - Wait 1-2 minutes

4. Verify
   - Go to /en/locations
   - Should see locations now

5. Re-run Diagnostics
   - Go to /en/owner-diagnostics
   - Check if errors resolved
```

---

### Option B: إذا ما عندك GMB Locations

```bash
1. افتح GMB Dashboard
   - https://business.google.com/

2. Add Business Location
   - Click "Add Location"
   - Enter business details
   - Verify location

3. في تطبيقك، Connect GMB
   - Settings → Connect GMB Account

4. Sync
   - Dashboard → Sync GMB Data

5. Verify
   - /en/locations should show new location
```

---

## 📊 Expected Results After Fix

After successful fix, diagnostics should show:

```json
{
  "success": true,
  "details": {
    "connectivity_status": "all_apis_working",
    "total_tests": 7,
    "passed_tests": 7,  // ← Should be 7/7
    "failed_tests": 0,   // ← Should be 0
    "api_tests": {
      "accounts": { "success": true },
      "locations": { "success": true },  // ← Fixed!
      "reviews": { "success": true },    // ← Fixed!
      "questions": { "success": true },  // ← Fixed!
      "posts": { "success": true },      // ← Fixed!
      "media": { "success": true },      // ← Fixed!
      "insights": { "success": true }    // ← Fixed!
    }
  }
}
```

---

## 🚨 If Still Failing

### Check API Endpoint URLs

الملف: `google-api-docs/` folder أو GMB integration code

**تأكد من:**
```typescript
// Correct endpoints (2024/2025)
const BASE_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
// NOT the old: 'https://mybusiness.googleapis.com/v4'

// Locations endpoint
GET ${BASE_URL}/accounts/${accountId}/locations

// Reviews endpoint
GET ${BASE_URL}/accounts/${accountId}/locations/${locationId}/reviews

// Questions endpoint
GET ${BASE_URL}/accounts/${accountId}/locations/${locationId}/questions
```

**Note:** GMB API endpoints changed in 2023-2024, make sure using latest ones!

---

## 📝 Debugging Checklist

- [ ] GMB Account has actual business locations
- [ ] OAuth connection active (not expired)
- [ ] OAuth has correct permissions/scopes
- [ ] Location ID format is correct
- [ ] Location ID actually exists
- [ ] API endpoints using latest URLs
- [ ] Access token valid and not expired
- [ ] Database has locations synced
- [ ] No RLS blocking queries

---

## 🆘 Need More Help?

**Information needed:**
1. How many business locations in GMB Dashboard? _____
2. Are locations showing in `/en/locations`? Yes / No
3. Last successful sync timestamp? _____
4. Any errors in browser console when syncing? _____
5. Any errors in Sentry? _____

**Next steps:**
- Share the above info
- We'll dig deeper into the specific issue
- Might need to check GMB API integration code
