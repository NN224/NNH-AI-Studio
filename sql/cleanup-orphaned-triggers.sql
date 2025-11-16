-- ============================================
-- 🗑️ حذف Triggers اليتيمة (Orphaned Triggers)
-- ============================================
-- هذي triggers تستدعي functions محذوفة
-- ============================================

-- 1️⃣ Triggers تستدعي notify_new_question() (محذوفة)
DROP TRIGGER IF EXISTS trigger_notify_new_question ON gmb_questions;

-- 2️⃣ Triggers تستدعي notify_new_review() (محذوفة)
DROP TRIGGER IF EXISTS new_review_notification ON gmb_reviews;
DROP TRIGGER IF EXISTS trigger_notify_new_review ON gmb_reviews;

-- ============================================
-- ✅ تحقق من النتيجة
-- ============================================
-- شوف الـ Triggers المتبقية
SELECT 
    trigger_schema,
    event_object_table,
    trigger_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

