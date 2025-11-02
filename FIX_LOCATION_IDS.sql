-- ========================================
-- إصلاح location_id في قاعدة البيانات
-- ========================================
-- هذا السكريبت يضيف 'accounts/' prefix للـ location_id
-- إذا لم يكن موجوداً
-- ========================================

-- 1. عرض location_id الحالية (قبل الإصلاح)
SELECT 
  'Before Fix' as status,
  id,
  location_id as current_location_id,
  gmb_account_id,
  (SELECT account_id FROM gmb_accounts WHERE id = gmb_account_id) as account_id
FROM gmb_locations
ORDER BY created_at DESC;

-- 2. إصلاح location_id - إضافة accounts/ prefix إذا لم يكن موجوداً
UPDATE gmb_locations l
SET location_id = CASE
  -- إذا location_id يبدأ بـ 'accounts/' بالفعل، لا تغيره
  WHEN l.location_id LIKE 'accounts/%' THEN l.location_id
  
  -- إذا location_id يبدأ بـ 'locations/'، استبدله بـ 'accounts/{account_id}/locations/{location_id}'
  WHEN l.location_id LIKE 'locations/%' THEN 
    COALESCE(
      a.account_id || '/' || l.location_id,
      'accounts/' || SPLIT_PART(a.account_id, '/', 2) || '/' || l.location_id
    )
  
  -- إذا location_id مجرد رقم، أضف 'accounts/{account_id}/locations/{location_id}'
  ELSE 
    COALESCE(
      a.account_id || '/locations/' || l.location_id,
      'accounts/' || SPLIT_PART(a.account_id, '/', 2) || '/locations/' || l.location_id
    )
END,
updated_at = NOW()
FROM gmb_accounts a
WHERE l.gmb_account_id = a.id
  AND (
    -- Update only if location_id doesn't start with 'accounts/'
    l.location_id NOT LIKE 'accounts/%'
  )
RETURNING 
  l.id,
  l.location_id as new_location_id,
  a.account_id as account_id;

-- 3. عرض location_id بعد الإصلاح
SELECT 
  'After Fix' as status,
  id,
  location_id,
  CASE 
    WHEN location_id LIKE 'accounts/%' THEN '✅ Correct format'
    ELSE '❌ Still incorrect'
  END as format_check
FROM gmb_locations
ORDER BY created_at DESC;

-- ========================================
-- ملاحظات:
-- ========================================
-- إذا كان account_id أيضاً بدون 'accounts/' prefix،
-- قد تحتاج لتحديثه أولاً في جدول gmb_accounts
-- ========================================

