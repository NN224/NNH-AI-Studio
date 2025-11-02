-- حذف التكرارات من gmb_locations
-- ⚠️ هذا السكريبت يحذف التكرارات ويبقي على الأحدث

-- الخطوة 1: عرض التكرارات أولاً (للتحقق)
SELECT 
  location_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ' ORDER BY updated_at DESC) as location_ids,
  STRING_AGG(location_name, ' | ' ORDER BY updated_at DESC) as location_names,
  STRING_AGG(updated_at::text, ' | ' ORDER BY updated_at DESC) as update_times
FROM gmb_locations
GROUP BY location_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- الخطوة 2: حذف التكرارات (يبقي على الأحدث)
-- ⚠️ تأكد من مراجعة النتائج من الخطوة 1 قبل التنفيذ
DELETE FROM gmb_locations
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY location_id 
        ORDER BY updated_at DESC, created_at DESC
      ) as rn
    FROM gmb_locations
  ) ranked
  WHERE rn > 1
);

-- الخطوة 3: التحقق من عدم وجود تكرارات
SELECT 
  location_id,
  COUNT(*) as count
FROM gmb_locations
GROUP BY location_id
HAVING COUNT(*) > 1;
-- يجب أن يكون النتيجة 0 rows

-- الخطوة 4: عرض عدد المواقع بعد التنظيف
SELECT COUNT(*) as total_locations FROM gmb_locations;

