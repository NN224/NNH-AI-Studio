-- ========================================
-- إصلاح location_id - نسخة مبسطة
-- ========================================
-- هذا السكريبت يضيف 'accounts/' prefix للـ location_id
-- ========================================

-- 1. عرض البيانات الحالية
SELECT 
  'Before Fix' as status,
  l.id,
  l.location_id as current_location_id,
  a.account_id as account_id_from_db
FROM gmb_locations l
LEFT JOIN gmb_accounts a ON a.id = l.gmb_account_id
ORDER BY l.created_at DESC;

-- 2. إصلاح location_id
UPDATE gmb_locations l
SET 
  location_id = CASE
    -- إذا location_id يبدأ بـ 'accounts/' بالفعل، لا تغيره
    WHEN l.location_id LIKE 'accounts/%' THEN l.location_id
    
    -- إذا location_id يبدأ بـ 'locations/'، استبدله بـ accounts/{account_id}/locations/{location_id}
    WHEN l.location_id LIKE 'locations/%' THEN 
      COALESCE(
        CASE 
          WHEN a.account_id LIKE 'accounts/%' THEN a.account_id || '/' || l.location_id
          ELSE 'accounts/' || a.account_id || '/' || l.location_id
        END,
        l.location_id
      )
    
    -- إذا location_id مجرد رقم أو نص، أضف accounts/{account_id}/locations/{location_id}
    ELSE 
      COALESCE(
        CASE 
          WHEN a.account_id LIKE 'accounts/%' THEN a.account_id || '/locations/' || l.location_id
          ELSE 'accounts/' || a.account_id || '/locations/' || l.location_id
        END,
        'accounts/unknown/locations/' || l.location_id
      )
  END,
  updated_at = NOW()
FROM gmb_accounts a
WHERE l.gmb_account_id = a.id
  AND l.location_id NOT LIKE 'accounts/%'
RETURNING 
  l.id,
  l.location_id as old_location_id,
  l.location_id as new_location_id;

-- 3. التحقق من النتيجة
SELECT 
  'After Fix' as status,
  id,
  location_id,
  CASE 
    WHEN location_id LIKE 'accounts/%/locations/%' THEN '✅ Correct format'
    WHEN location_id LIKE 'accounts/%' THEN '⚠️ Has accounts/ but missing locations/'
    ELSE '❌ Still incorrect'
  END as format_check,
  (SELECT account_id FROM gmb_accounts WHERE id = gmb_account_id) as account_id
FROM gmb_locations
ORDER BY created_at DESC;

-- ========================================
-- ملاحظات:
-- ========================================
-- إذا لم يتم التحديث (0 rows affected):
-- - تأكد من أن gmb_accounts.account_id موجود
-- - تأكد من أن gmb_locations.gmb_account_id يشير إلى gmb_accounts.id صحيح
--
-- إذا كان account_id أيضاً بدون 'accounts/' prefix:
-- قد تحتاج لتحديثه أولاً
-- ========================================

