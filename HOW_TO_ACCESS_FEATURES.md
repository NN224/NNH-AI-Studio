# دليل الوصول إلى الميزات الجديدة

## 1. Location Attributes Dialog (مع Links و Attributes و Profile Strength و Lock)

**كيفية الوصول:**
1. اذهب إلى **Locations** tab في GMB Dashboard
2. اختر أي موقع من القائمة
3. اضغط على زر **"Manage Attributes"** في أسفل Location Card
4. سيفتح Dialog يحتوي على:
   - **Links Section**: قائمة بالروابط الموجودة والمفقودة
   - **Attributes Section**: جميع السمات بأسمائها (الموجودة والمفقودة)
   - **Profile Strength Indicator**: في أعلى Dialog مع Progress Bar و Badges
   - **Lock Feature**: زر Lock/Unlock في أعلى Dialog
   - **Location Details**: معلومات الموقع الأساسية

## 2. Location Profile Enhanced

**كيفية الوصول:**
1. اذهب إلى **Locations** tab
2. اختر أي موقع
3. اضغط على زر **"View Profile"** في Location Card
4. ستفتح صفحة محسّنة تعرض:
   - **Cover Photo**: في أعلى الصفحة
   - **Logo**: بجانب اسم العمل
   - **Google Map**: مع اسم العمل بشكل صحيح
   - **Action Buttons**: Edit, Attributes, View Reviews

**أو:**
- اضغط مباشرة على **"View Profile"** في أي Location Card

## 3. Last Sync Info Component

**كيفية الوصول:**
1. اذهب إلى **Dashboard** tab (التبويب الرئيسي)
2. ستجد **Last Sync Info** Card أسفل Stat Cards مباشرة
3. يعرض:
   - آخر وقت Sync
   - حالة Sync الحالية
   - زر "Sync Now"
   - Auto-Sync Schedule (إن وجد)

## 4. Stat Cards المحسّنة

**كيفية الوصول:**
1. اذهب إلى **Dashboard** tab
2. في أعلى الصفحة ستجد 4 Stat Cards:
   - **Total Reviews**: مع Average Rating (نجوم)
   - **Average Rating**: مع عرض النجوم
   - **New Reviews**: Reviews الجديدة في آخر 30 يوم
   - **Response Rate**: مع Empty States

**ملاحظة:** إذا كانت القيم 0، ستظهر Empty States مع رسائل توضيحية.

## 5. Media Display المحسّن

**كيفية الوصول:**
1. اذهب إلى **Media** tab
2. أو في **Location Card** ستجد:
   - **Cover Photo** في أعلى الكارد
   - **Logo** بجانب اسم العمل

## 6. Cover Photo و Logo في Location Cards

**كيفية الرؤية:**
- تظهر تلقائياً في **Locations** tab
- Cover Photo في أعلى كل Location Card
- Logo بجانب اسم العمل في كل Location Card

## 7. Google Map مع اسم العمل الصحيح

**كيفية الرؤية:**
- في أي **Location Card** في **Locations** tab
- الخريطة الآن تستخدم `location.location_name` في query parameter
- أو في **Location Profile Enhanced** (عند الضغط على View Profile)

---

## ملاحظات مهمة:

1. **إذا لم تظهر الصور (Cover/Logo):**
   - قد تحتاج إلى عمل **Sync** جديد للحصول على Media من Google API
   - اذهب إلى Dashboard > اضغط على "Sync Now"

2. **إذا لم يفتح Location Attributes Dialog:**
   - تأكد من الضغط على زر "Manage Attributes" في Location Card
   - تأكد من أن Location Card مرئية بالكامل

3. **إذا لم يفتح Location Profile Enhanced:**
   - تأكد من الضغط على زر "View Profile"
   - تأكد من أن URL يحتوي على `?location=location_id`

4. **إذا لم تظهر Stat Cards:**
   - تأكد من أنك في **Dashboard** tab
   - تأكد من وجود بيانات (locations, reviews)

---

## الفيديو التوضيحي:

1. افتح **Locations** tab
2. اضغط على **"Manage Attributes"** → سيفتح Dialog مع جميع الميزات
3. اضغط على **"View Profile"** → سيفتح Location Profile Enhanced
4. عد إلى **Dashboard** tab → ستجد Last Sync Info و Stat Cards

