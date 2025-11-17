# جميع Google My Business APIs المتاحة

## 1. ✅ Business Information API (نستخدمه حالياً)
**الاستخدام**: جلب معلومات النشاط الأساسية

### الحقول المتاحة:
- `name` - Location ID ✅
- `title` - اسم النشاط ✅
- `storefrontAddress` - العنوان ✅
- `phoneNumbers` - رقم الهاتف ✅
- `websiteUri` - الموقع الإلكتروني ✅
- `categories` - الفئات ✅
- `profile.description` - الوصف ✅
- `regularHours` - ساعات العمل ✅
- `specialHours` - ساعات خاصة ✅
- `moreHours` - ساعات إضافية (breakfast, lunch, dinner, etc.) ✅
- `serviceItems` - الخدمات المقدمة ✅
- `openInfo` - حالة الفتح/الإغلاق + تاريخ الافتتاح ✅
- `metadata` - معلومات إضافية (rating, review count, etc.) ✅
- `latlng` - الإحداثيات ✅
- `labels` - تصنيفات داخلية ✅

### ما نستخدمه:
- ✅ Basic Info (name, address, phone, website, categories)
- ✅ Description
- ✅ Opening Date
- ⚠️ Service Area (موجود بالكود لكن ما بيظهر)
- ⚠️ Regular Hours (موجود بالكود لكن ما بيظهر)
- ⚠️ More Hours (موجود بالكود لكن ما بيظهر)
- ⚠️ Service Items (موجود بالكود لكن ما بيظهر)

---

## 2. ✅ Attributes API (نستخدمه الآن)
**الاستخدام**: جلب attributes للنشاط

### الحقول المتاحة:
- `attributes[]` - قائمة attributes
  - `name` - اسم الـ attribute
  - `values` - قيم الـ attribute (BOOL, ENUM, etc.)
  - `uriValues` - روابط URL (menu, booking, order, etc.)
  - `valueType` - نوع الـ attribute

### ما نستخدمه:
- ✅ From the Business attributes
- ✅ Features (amenities, payment_methods, services, atmosphere)
- ⚠️ URL attributes (menu, booking, order, appointment) - موجود بالكود لكن قد لا يظهر

---

## 3. ⭐ Place Actions API (مهم جداً!)
**الاستخدام**: Action links (menu, booking, order, etc.)

### Endpoints:
- `GET /v1/locations/{location}/placeActionLinks`
- `POST /v1/locations/{location}/placeActionLinks`
- `PATCH /v1/locations/{location}/placeActionLinks/{placeActionLinkId}`
- `DELETE /v1/locations/{location}/placeActionLinks/{placeActionLinkId}`

### الحقول المتاحة:
- `placeActionType` - نوع الـ action:
  - `BOOK` - حجز (booking)
  - `ORDER` - طلب (order online)
  - `LEARN_MORE` - معرفة المزيد
  - `SIGN_UP` - تسجيل
  - `GET_OFFER` - احصل على عرض
  - `CALL` - اتصال
  - `SHOP` - تسوق
- `uri` - الرابط
- `providerType` - مزود الخدمة (GOOGLE, MERCHANT, etc.)
- `isPreferred` - هل هو الخيار المفضل
- `createTime` / `updateTime` - تواريخ

### **ما يجب إضافته**:
- ❌ **لم نستخدمه بعد** - يجب إضافة endpoint لجلب Place Action Links
- هذا هو المصدر الصحيح لـ menu, booking, order links!

---

## 4. Lodging API (للفنادق فقط)
**الاستخدام**: معلومات الفنادق والإقامة

### ليس ذو صلة لـ Night Clubs/Bars - نتجاهله

---

## 5. ⭐ Business Calls API (جديد!)
**الاستخدام**: إدارة مكالمات العملاء

### Endpoints:
- `GET /v1/locations/{name}/businesscallsinsights`

### الحقول المتاحة:
- `aggregateMetrics` - إحصائيات المكالمات
  - `answeredCallsCount` - عدد المكالمات المجابة
  - `missedCallsCount` - عدد المكالمات الفائتة
  - `callsCount` - إجمالي المكالمات

### **ما يمكن إضافته**:
- ❌ **لم نستخدمه** - يمكن عرض إحصائيات المكالمات في Dashboard

---

## 6. ✅ Q&A API (نستخدمه)
**الاستخدام**: الأسئلة والأجوبة

### نستخدمه في Questions tab ✅

---

## 7. Notifications API (معطل)
**الاستخدام**: Pub/Sub notifications

### معطل حالياً بسبب webhook spam

---

## 8. Account Management API (نستخدمه)
**الاستخدام**: إدارة الحسابات

### نستخدمه لـ:
- ✅ List accounts
- ✅ Get account info

---

## 9. Verifications API
**الاستخدام**: التحقق من الملفات

### غير مستخدم حالياً

---

# ملخص: ما يجب إضافته للـ Beta

## 🔴 أولوية عالية (High Priority):

### 1. **Place Action Links** - الأهم!
- إضافة endpoint: `/api/gmb/place-actions/{locationId}`
- جلب action links من `mybusinessplaceactions` API
- عرضها في Business Info tab بدلاً من محاولة استخراجها من attributes

**سبب الأهمية**: هذا هو المصدر الصحيح لـ menu, booking, order links!

### 2. **Business Hours** (Regular + More Hours)
- عرض ساعات العمل في Business Info tab
- More Hours (breakfast, lunch, dinner, happy hour, etc.)

### 3. **Service Items**
- عرض الخدمات المقدمة (إذا موجودة)

## 🟡 أولوية متوسطة (Medium Priority):

### 4. **Service Area**
- عرض إذا كان النشاط يقدم خدمات في منطقة معينة

### 5. **Business Calls Insights**
- إضافة endpoint لجلب إحصائيات المكالمات
- عرضها في Dashboard أو Analytics

## 🟢 أولوية منخفضة (Low Priority):

### 6. **Labels**
- عرض التصنيفات الداخلية (internal use only)

### 7. **Relationship Data**
- عرض Parent/Child locations (if any)

---

# الخطة للـ Beta:

## Phase 1 - إصلاحات عاجلة (اليوم):
1. ✅ إضافة fetchAttributes - **تم**
2. ✅ إصلاح extraction logic - **تم**
3. ⏳ إضافة Place Actions endpoint - **قيد التنفيذ**
4. ⏳ عرض Business Hours

## Phase 2 - تحسينات (قبل Launch):
1. Business Calls insights
2. Service Items display
3. Service Area display
4. Better error handling

## Phase 3 - مستقبلاً:
1. Food Menus API (للمطاعم)
2. Verifications API
3. Advanced features

---

# الاستنتاج:

**المشكلة الرئيسية**: 
- كنا نحاول جلب `specialLinks` من `profile` - وهذا خطأ!
- الحل الصحيح: استخدام **Place Actions API**

**ما يجب فعله الآن**:
1. إضافة endpoint لجلب Place Action Links
2. تحديث sync logic لجلب Place Actions
3. عرضها في Business Info tab

هل تريد أن أبدأ بإضافة Place Actions API؟

