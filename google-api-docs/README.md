# 📚 Google My Business API - Official Documentation

## 📋 نظرة عامة

هذا المجلد يحتوي على **الوثائق الرسمية من Google** لجميع APIs المستخدمة في المشروع.

> **⚠️ مهم جداً:** عند أي تعديل على Dashboard أو ميزات GMB، **يجب الرجوع لهذه الوثائق أولاً** للتأكد من الصحة!

---

## 📦 APIs المتوفرة

### 1. **Account Management API**
**المجلد:** `mybusinessaccountmanagement/v1/`

**الاستخدام:**
- إدارة حسابات GMB
- الوصول للحسابات
- إدارة الصلاحيات

**الملفات:**
- `mybusinessaccountmanagement-api.json` - API Schema الرسمي
- `mybusinessaccountmanagement-gen.go` - Go client generated

---

### 2. **Business Information API**
**المجلد:** `mybusinessbusinessinformation/v1/`

**الاستخدام:**
- معلومات الأعمال (Business Info)
- تحديث بيانات الموقع
- الفئات والخدمات
- ساعات العمل
- الشعارات والصور

**الملفات:**
- `mybusinessbusinessinformation-api.json` - API Schema الرسمي
- `mybusinessbusinessinformation-gen.go` - Go client generated

**📌 ملاحظة:** هذا أكثر API نستخدمه في Dashboard!

---

### 3. **Business Calls API**
**المجلد:** `mybusinessbusinesscalls/v1/`

**الاستخدام:**
- تتبع المكالمات
- إحصائيات المكالمات من GMB

**الملفات:**
- `mybusinessbusinesscalls-api.json` - API Schema الرسمي
- `mybusinessbusinesscalls-gen.go` - Go client generated

---

### 4. **Lodging API**
**المجلد:** `mybusinesslodging/v1/`

**الاستخدام:**
- معلومات خاصة بالفنادق والإقامة
- المرافق والخدمات الفندقية

**الملفات:**
- `mybusinesslodging-api.json` - API Schema الرسمي
- `mybusinesslodging-gen.go` - Go client generated

---

### 5. **Notifications API**
**المجلد:** `mybusinessnotifications/v1/`

**الاستخدام:**
- إدارة الإشعارات
- Webhooks
- Real-time updates

**الملفات:**
- `mybusinessnotifications-api.json` - API Schema الرسمي
- `mybusinessnotifications-gen.go` - Go client generated

---

### 6. **Place Actions API**
**المجلد:** `mybusinessplaceactions/v1/`

**الاستخدام:**
- إجراءات الموقع (Call, Book, Order)
- أزرار الـ CTA في GMB

**الملفات:**
- `mybusinessplaceactions-api.json` - API Schema الرسمي
- `mybusinessplaceactions-gen.go` - Go client generated

---

### 7. **Q&A API**
**المجلد:** `mybusinessqanda/v1/`

**الاستخدام:**
- الأسئلة والأجوبة
- إدارة Questions
- الردود على الأسئلة

**الملفات:**
- `mybusinessqanda-api.json` - API Schema الرسمي
- `mybusinessqanda-gen.go` - Go client generated

---

### 8. **Verifications API**
**المجلد:** `mybusinessverifications/v1/`

**الاستخدام:**
- التحقق من ملكية الموقع
- طرق التحقق المتاحة

**الملفات:**
- `mybusinessverifications-api.json` - API Schema الرسمي
- `mybusinessverifications-gen.go` - Go client generated

---

## 🔍 كيفية استخدام هذه الوثائق

### 1. قبل تعديل أي ميزة في Dashboard:
```bash
# مثال: تعديل Business Info
cd google-api-docs/mybusinessbusinessinformation/v1/
cat mybusinessbusinessinformation-api.json | jq '.schemas.Location'
```

### 2. للتحقق من الحقول المتاحة:
- افتح الملف `*-api.json` المناسب
- ابحث عن Schema الذي تحتاجه
- تأكد من الحقول، الأنواع، والقيود

### 3. عند إضافة ميزة جديدة:
1. راجع API Schema في JSON
2. تأكد من الـ endpoints المتاحة
3. تحقق من الـ permissions المطلوبة
4. اقرأ descriptions للحقول

---

## 🗄️ Database Schema Reference

**⚠️ مهم:** بالإضافة للـ Google APIs، راجع دائماً Database Schema!

**الملف:** `DATABASE_SCHEMA.md`

يحتوي على:
- ✅ جميع الجداول (24 جدول)
- ✅ جميع الأعمدة (462 عمود)
- ✅ العلاقات (Foreign Keys)
- ✅ Indexes (253 index)
- ✅ RLS Policies (100 policy)
- ✅ التوافق مع Google APIs

**قاعدة ذهبية:**
```
Google API Schema + Database Schema = التوافق الكامل ✅
```

---

## 📖 أمثلة على الاستخدام

### مثال 1: التحقق من حقول Location
```json
// في mybusinessbusinessinformation-api.json
{
  "Location": {
    "properties": {
      "name": { "type": "string" },
      "languageCode": { "type": "string" },
      "storeCode": { "type": "string" },
      "title": { "type": "string" },
      // ...
    }
  }
}
```

### مثال 2: التحقق من Service Items
```json
// في mybusinessbusinessinformation-api.json
{
  "ServiceItem": {
    "properties": {
      "displayName": { "type": "string" },
      "description": { "type": "string" },
      "price": { "$ref": "Money" }
    }
  }
}
```

---

## ⚠️ قواعد مهمة

### ✅ افعل:
1. **دائماً راجع الوثائق قبل التعديل**
2. تحقق من الحقول المطلوبة (required)
3. تأكد من أنواع البيانات (types)
4. اقرأ الـ descriptions للفهم الصحيح
5. تحقق من الـ enum values المسموحة

### ❌ لا تفعل:
1. لا تعدل هذه الملفات - هي للمرجع فقط
2. لا تضيف حقول غير موجودة في API
3. لا تفترض أسماء الحقول - راجع الوثائق
4. لا تتجاهل القيود والتحذيرات

---

## 🔗 روابط مفيدة

### الوثائق الرسمية:
- **Google My Business API:** https://developers.google.com/my-business
- **Business Profile API:** https://developers.google.com/my-business/content/
- **API Reference:** https://developers.google.com/my-business/reference/rest

### في المشروع:
- **الكود:** `lib/gmb/` - GMB client implementation
- **الأنواع:** `lib/types/gmb.ts` - TypeScript types
- **الخدمات:** `lib/services/` - Business logic

---

## 📊 هيكل الملفات

```
google-api-docs/
├── mybusinessaccountmanagement/v1/
│   ├── mybusinessaccountmanagement-api.json
│   └── mybusinessaccountmanagement-gen.go
├── mybusinessbusinessinformation/v1/
│   ├── mybusinessbusinessinformation-api.json  ← الأكثر استخداماً
│   └── mybusinessbusinessinformation-gen.go
├── mybusinessbusinesscalls/v1/
│   ├── mybusinessbusinesscalls-api.json
│   └── mybusinessbusinesscalls-gen.go
├── mybusinesslodging/v1/
│   ├── mybusinesslodging-api.json
│   └── mybusinesslodging-gen.go
├── mybusinessnotifications/v1/
│   ├── mybusinessnotifications-api.json
│   └── mybusinessnotifications-gen.go
├── mybusinessplaceactions/v1/
│   ├── mybusinessplaceactions-api.json
│   └── mybusinessplaceactions-gen.go
├── mybusinessqanda/v1/
│   ├── mybusinessqanda-api.json
│   └── mybusinessqanda-gen.go
├── mybusinessverifications/v1/
│   ├── mybusinessverifications-api.json
│   └── mybusinessverifications-gen.go
└── README.md  ← هذا الملف
```

---

## 🎯 حالات استخدام شائعة

### تعديل صفحة Business Info:
```
1. افتح: google-api-docs/mybusinessbusinessinformation/v1/mybusinessbusinessinformation-api.json
2. ابحث عن: "Location" schema
3. راجع الحقول المتاحة
4. طبق التعديلات في: components/features/
```

### إضافة ميزة Q&A:
```
1. افتح: google-api-docs/mybusinessqanda/v1/mybusinessqanda-api.json
2. ابحث عن: "Question" و "Answer" schemas
3. راجع الـ methods المتاحة
4. طبق التعديلات في: components/questions/
```

### تحديث Reviews:
```
ملاحظة: Reviews API ليست في My Business API V1
استخدم: Google Business Profile API (مختلف)
الوثائق: https://developers.google.com/my-business/content/review-data
```

---

## 💡 نصائح

1. **استخدم jq للبحث:**
   ```bash
   cat mybusinessbusinessinformation-api.json | jq '.schemas | keys'
   ```

2. **ابحث عن حقل معين:**
   ```bash
   cat mybusinessbusinessinformation-api.json | jq '.schemas.Location.properties.serviceItems'
   ```

3. **احفظ مرجع سريع:**
   ```bash
   cat mybusinessbusinessinformation-api.json | jq '.schemas | keys' > schemas-list.txt
   ```

---

## 🔄 آخر تحديث

**التاريخ:** نوفمبر 18، 2025  
**النسخة:** v1 (Google My Business API)  
**المصدر:** Google Official API Documentation

---

## 📞 ملاحظات

إذا وجدت أي اختلاف بين الكود والوثائق:
1. **الوثائق دائماً صحيحة** - هي المرجع الرسمي
2. حدث الكود ليتوافق مع الوثائق
3. وثق أي تغييرات في التعليقات

---

**تذكّر:** هذه الوثائق هي **المصدر الرسمي** من Google. لا تفترض أي شيء - راجع الوثائق دائماً! 📚

