# 🗄️ Database Quick Reference

## 📊 الملخص السريع

```
24  جدول
462 عمود
253 Index
100 RLS Policy
7   Views
96  Functions
23  Triggers
```

---

## 🔥 الجداول الأكثر استخداماً

### 1. `gmb_locations` (46 cols) - الأساس
```sql
-- Location من GMB
id, user_id, gmb_account_id, name, title,
categories, phone_numbers, website_uri,
regular_hours, special_hours, service_items,
address, latitude, longitude, metadata, raw_data
```

### 2. `gmb_reviews` (51 cols) - المراجعات
```sql
-- Reviews مع AI analysis
id, user_id, location_id, review_id,
reviewer_display_name, star_rating, comment,
reply_comment, has_reply,
ai_sentiment, ai_summary, ai_suggested_reply
```

### 3. `gmb_questions` (37 cols) - الأسئلة
```sql
-- Q&A من GMB
id, location_id, question_id, author_display_name,
text, top_answers, total_answer_count
```

### 4. `gmb_accounts` (18 cols) - الحسابات
```sql
-- GMB accounts
id, user_id, gmb_account_id, account_name,
oauth_access_token, oauth_refresh_token
```

---

## 🔗 العلاقات الأساسية

```
auth.users
  └─ gmb_accounts
      └─ gmb_locations
          ├─ gmb_reviews
          ├─ gmb_questions
          ├─ gmb_posts
          ├─ gmb_media
          └─ gmb_performance_metrics
```

---

## 🎯 API ↔ Database Mapping

### Business Information API → gmb_locations
```
Location.name              → gmb_locations.name
Location.title             → gmb_locations.title
Location.phoneNumbers      → gmb_locations.phone_numbers (jsonb)
Location.categories        → gmb_locations.categories (jsonb)
Location.regularHours      → gmb_locations.regular_hours (jsonb)
Location.serviceItems      → gmb_locations.service_items (jsonb)
Location.address           → gmb_locations.address (jsonb)
Location.latlng            → gmb_locations.latitude, longitude
```

### Q&A API → gmb_questions
```
Question.name              → gmb_questions.question_id
Question.author            → gmb_questions.author_display_name
Question.text              → gmb_questions.text
Question.topAnswers        → gmb_questions.top_answers (jsonb)
Question.totalAnswerCount  → gmb_questions.total_answer_count
```

### Reviews → gmb_reviews
```
Review.name                → gmb_reviews.review_id
Review.reviewer            → gmb_reviews.reviewer_display_name
Review.starRating          → gmb_reviews.star_rating
Review.comment             → gmb_reviews.comment
Review.reviewReply         → gmb_reviews.reply_comment
```

---

## 🔍 استعلامات شائعة

### جلب locations للمستخدم:
```sql
SELECT * FROM gmb_locations
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### جلب reviews لـ location:
```sql
SELECT * FROM gmb_reviews
WHERE location_id = 'xxx'
  AND user_id = auth.uid()
ORDER BY create_time DESC;
```

### جلب questions غير مجابة:
```sql
SELECT * FROM gmb_questions
WHERE location_id = 'xxx'
  AND total_answer_count = 0
ORDER BY create_time DESC;
```

### تحليل AI للمراجعات:
```sql
SELECT 
  star_rating,
  ai_sentiment,
  COUNT(*) as count
FROM gmb_reviews
WHERE location_id = 'xxx'
  AND user_id = auth.uid()
GROUP BY star_rating, ai_sentiment;
```

---

## ⚠️ ملاحظات مهمة

### JSONB Fields (مرنة):
```javascript
// gmb_locations.service_items
[
  {
    "displayName": "Haircut",
    "description": "Men's haircut",
    "price": {
      "currencyCode": "USD",
      "units": "25"
    }
  }
]

// gmb_locations.regular_hours
{
  "periods": [
    {
      "openDay": "MONDAY",
      "openTime": "09:00",
      "closeDay": "MONDAY",
      "closeTime": "17:00"
    }
  ]
}

// gmb_locations.categories
{
  "primaryCategory": {
    "displayName": "Restaurant",
    "categoryId": "gcid:restaurant"
  },
  "additionalCategories": [...]
}
```

### Encrypted Fields:
```sql
-- هذه الحقول encrypted:
gmb_accounts.oauth_access_token
gmb_accounts.oauth_refresh_token
ai_settings.api_key
```

### Real-time Enabled:
```sql
-- هذه الجداول real-time enabled:
gmb_locations   ✅
gmb_questions   ✅
```

---

## 🔒 RLS Policies

جميع الجداول محمية بـ RLS:
```sql
-- المستخدمون يشوفوا بياناتهم فقط
SELECT: user_id = auth.uid()
INSERT: user_id = auth.uid()
UPDATE: user_id = auth.uid()
DELETE: user_id = auth.uid()
```

---

## 📏 القيود (Constraints)

### Primary Keys:
جميع الجداول: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`

### Foreign Keys:
```sql
gmb_locations.user_id          → auth.users(id)
gmb_locations.gmb_account_id   → gmb_accounts(id)
gmb_reviews.user_id            → auth.users(id)
gmb_reviews.location_id        → gmb_locations(id)
gmb_questions.location_id      → gmb_locations(id)
ai_requests.user_id            → auth.users(id)
ai_requests.location_id        → gmb_locations(id)
```

### Timestamps:
جميع الجداول:
```sql
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

---

## 🎯 الاستخدام السريع

### 1. تطوير ميزة GMB جديدة:
```bash
# الخطوات:
1. راجع: google-api-docs/[api-name]/v1/*.json
2. راجع: google-api-docs/DATABASE_SCHEMA.md
3. تحقق من: database-schema.csv (للتفاصيل)
4. طوّر الميزة
5. اختبر
```

### 2. البحث عن حقل:
```bash
# في database-schema.csv
grep "service_items" database-schema.csv
```

### 3. فهم العلاقات:
```bash
# راجع DATABASE_SCHEMA.md - قسم "العلاقات الرئيسية"
```

---

## 📁 الملفات

- **هذا الملف:** `google-api-docs/DATABASE_QUICK_REF.md` (مرجع سريع)
- **التفاصيل الكاملة:** `google-api-docs/DATABASE_SCHEMA.md`
- **CSV الكامل:** `database-schema.csv`
- **Google APIs:** `google-api-docs/[api-name]/`

---

**آخر تحديث:** نوفمبر 18، 2025

