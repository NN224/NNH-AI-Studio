# 🔧 إعداد Supabase Realtime

## المشكلة

إذا ظهرت رسائل خطأ في Console مثل:
```
Realtime subscription error: Unable to subscribe to changes with given parameters. 
Please check Realtime is enabled for the given connect parameters: [schema:
```

هذا يعني أن **Realtime** غير مفعّل في Supabase للجداول المطلوبة.

## الحل

### 1. تفعيل Realtime من Supabase Dashboard

1. افتح **Supabase Dashboard** → مشروعك
2. اذهب إلى **Database** → **Replication**
3. فعّل Replication للجداول التالية:
   - ✅ `gmb_locations`
   - ✅ `gmb_reviews`
   - ✅ `gmb_questions`
   - ✅ `gmb_media`
   - ✅ `gmb_performance_metrics`
   - ✅ `gmb_search_keywords`
   - ✅ `activity_logs`
   - ✅ `content_generations`

### 2. أو استخدم SQL Migration

أنشئ ملف migration جديد:

```sql
-- Enable Realtime for all required tables
ALTER PUBLICATION supabase_realtime ADD TABLE gmb_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE gmb_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE gmb_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE gmb_media;
ALTER PUBLICATION supabase_realtime ADD TABLE gmb_performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE gmb_search_keywords;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE content_generations;
```

### 3. التحقق من التفعيل

بعد تفعيل Realtime، يجب أن تختفي رسائل الخطأ من Console.

## ملاحظات

- ✅ **الكود الآن يتعامل مع أخطاء Realtime بشكل صحيح** - إذا لم يكن Realtime مفعّل، التطبيق سيعمل بشكل طبيعي لكن بدون تحديثات فورية
- ✅ **لا تظهر رسائل خطأ للمستخدم** في حالة Realtime configuration errors
- ✅ **AbortError في Sync** تم إصلاحه - الآن يتم معالجته بشكل صحيح

## اختبار Realtime

بعد تفعيل Realtime:

1. افتح صفحة Locations
2. افتح Console في المتصفح
3. يجب أن ترى: `✅ Locations realtime subscribed`
4. قم بتعديل location من Supabase Dashboard
5. يجب أن ترى التحديث في الواجهة تلقائياً

## إذا استمرت المشكلة

1. تحقق من أن `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` صحيحة
2. تحقق من أن Realtime مفعّل في Supabase Dashboard
3. تحقق من RLS Policies - يجب أن تكون موجودة للجداول
4. راجع Console logs للأخطاء التفصيلية

