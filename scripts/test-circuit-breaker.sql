-- ============================================================================
-- Circuit Breaker Testing Script
-- ============================================================================
-- Use this to test the circuit breaker functionality
-- ============================================================================

-- 1. عرض الحالة الحالية
SELECT * FROM v_circuit_breaker_status;

-- 2. تسجيل فشل (10 مرات لفتح circuit breaker)
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();
SELECT record_sync_failure();

-- 3. فحص الحالة (يجب أن يكون مفتوح الآن)
SELECT * FROM check_circuit_breaker();

-- 4. عرض التفاصيل
SELECT 
  is_open,
  reason,
  consecutive_failures,
  opened_at,
  EXTRACT(EPOCH FROM (NOW() - opened_at)) / 60 AS minutes_since_opened
FROM sync_circuit_breaker;

-- 5. إغلاق يدوياً (للاختبار)
SELECT close_circuit_breaker();

-- 6. تسجيل نجاح (يُعيد العداد)
SELECT record_sync_success();

-- 7. التحقق من إعادة تعيين العداد
SELECT consecutive_failures FROM sync_circuit_breaker;

-- ============================================================================
-- Cleanup (إعادة تعيين الحالة)
-- ============================================================================
UPDATE sync_circuit_breaker
SET
  is_open = false,
  consecutive_failures = 0,
  opened_at = NULL,
  reason = NULL,
  last_failure_at = NULL;
