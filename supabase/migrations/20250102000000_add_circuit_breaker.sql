-- ============================================================================
-- Circuit Breaker System
-- ============================================================================
-- Purpose: منع استنزاف الموارد عند فشل المزامنة المتكرر
-- يوقف جميع Workers عند حدوث فشل متكرر
-- ============================================================================

-- 1. إنشاء جدول Circuit Breaker
CREATE TABLE IF NOT EXISTS sync_circuit_breaker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_open BOOLEAN NOT NULL DEFAULT false,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إدراج سجل افتراضي
INSERT INTO sync_circuit_breaker (is_open, consecutive_failures) 
VALUES (false, 0)
ON CONFLICT DO NOTHING;

-- 2. إضافة Index للأداء
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_is_open 
ON sync_circuit_breaker(is_open) 
WHERE is_open = true;

-- 3. Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_circuit_breaker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_circuit_breaker_updated_at
  BEFORE UPDATE ON sync_circuit_breaker
  FOR EACH ROW
  EXECUTE FUNCTION update_circuit_breaker_updated_at();

-- 4. Helper Functions للـ Circuit Breaker

-- فتح Circuit Breaker
CREATE OR REPLACE FUNCTION open_circuit_breaker(p_reason TEXT DEFAULT 'Too many failures')
RETURNS void AS $$
BEGIN
  UPDATE sync_circuit_breaker
  SET
    is_open = true,
    opened_at = NOW(),
    reason = p_reason,
    updated_at = NOW()
  WHERE id = (SELECT id FROM sync_circuit_breaker LIMIT 1);
  
  -- إضافة log
  RAISE NOTICE '🔴 Circuit Breaker OPENED: %', p_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إغلاق Circuit Breaker
CREATE OR REPLACE FUNCTION close_circuit_breaker()
RETURNS void AS $$
BEGIN
  UPDATE sync_circuit_breaker
  SET
    is_open = false,
    closed_at = NOW(),
    consecutive_failures = 0,
    reason = NULL,
    updated_at = NOW()
  WHERE id = (SELECT id FROM sync_circuit_breaker LIMIT 1);
  
  RAISE NOTICE '✅ Circuit Breaker CLOSED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تسجيل فشل
CREATE OR REPLACE FUNCTION record_sync_failure()
RETURNS INTEGER AS $$
DECLARE
  v_failures INTEGER;
  v_threshold INTEGER := 10; -- فتح بعد 10 فشل متتالي
BEGIN
  UPDATE sync_circuit_breaker
  SET
    consecutive_failures = consecutive_failures + 1,
    last_failure_at = NOW(),
    updated_at = NOW()
  WHERE id = (SELECT id FROM sync_circuit_breaker LIMIT 1)
  RETURNING consecutive_failures INTO v_failures;
  
  -- فتح Circuit Breaker إذا تجاوزنا الحد
  IF v_failures >= v_threshold THEN
    PERFORM open_circuit_breaker(
      format('Circuit breaker triggered after %s consecutive failures', v_failures)
    );
  END IF;
  
  RETURN v_failures;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تسجيل نجاح (يُعيد العداد)
CREATE OR REPLACE FUNCTION record_sync_success()
RETURNS void AS $$
BEGIN
  UPDATE sync_circuit_breaker
  SET
    consecutive_failures = 0,
    last_failure_at = NULL,
    updated_at = NOW()
  WHERE id = (SELECT id FROM sync_circuit_breaker LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- فحص حالة Circuit Breaker
CREATE OR REPLACE FUNCTION check_circuit_breaker()
RETURNS TABLE(
  is_open BOOLEAN,
  opened_at TIMESTAMPTZ,
  reason TEXT,
  consecutive_failures INTEGER,
  can_retry BOOLEAN
) AS $$
DECLARE
  v_breaker RECORD;
  v_minutes_since_opened INTEGER;
  v_retry_after_minutes INTEGER := 10; -- إعادة المحاولة بعد 10 دقائق
BEGIN
  SELECT * INTO v_breaker
  FROM sync_circuit_breaker
  LIMIT 1;
  
  -- حساب الوقت منذ الفتح
  IF v_breaker.is_open AND v_breaker.opened_at IS NOT NULL THEN
    v_minutes_since_opened := EXTRACT(EPOCH FROM (NOW() - v_breaker.opened_at)) / 60;
    
    -- إعادة الإغلاق تلقائياً بعد 10 دقائق
    IF v_minutes_since_opened >= v_retry_after_minutes THEN
      PERFORM close_circuit_breaker();
      v_breaker.is_open := false;
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT
    v_breaker.is_open,
    v_breaker.opened_at,
    v_breaker.reason,
    v_breaker.consecutive_failures,
    NOT v_breaker.is_open OR v_minutes_since_opened >= v_retry_after_minutes AS can_retry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. إضافة RLS policies
ALTER TABLE sync_circuit_breaker ENABLE ROW LEVEL SECURITY;

-- Service role يمكنه القراءة والكتابة
CREATE POLICY "Service role can manage circuit breaker"
ON sync_circuit_breaker
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users يمكنهم القراءة فقط
CREATE POLICY "Authenticated users can view circuit breaker"
ON sync_circuit_breaker
FOR SELECT
TO authenticated
USING (true);

-- 6. إنشاء view للمراقبة
CREATE OR REPLACE VIEW v_circuit_breaker_status AS
SELECT
  is_open,
  opened_at,
  closed_at,
  reason,
  consecutive_failures,
  last_failure_at,
  CASE
    WHEN is_open AND opened_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (NOW() - opened_at)) / 60
    ELSE NULL
  END AS minutes_since_opened,
  CASE
    WHEN is_open THEN 'OPEN 🔴'
    ELSE 'CLOSED ✅'
  END AS status,
  updated_at
FROM sync_circuit_breaker
LIMIT 1;

COMMENT ON TABLE sync_circuit_breaker IS 'Circuit breaker لمنع استنزاف الموارد عند فشل المزامنة المتكرر';
COMMENT ON FUNCTION open_circuit_breaker IS 'فتح circuit breaker لإيقاف جميع sync workers';
COMMENT ON FUNCTION close_circuit_breaker IS 'إغلاق circuit breaker لإعادة تشغيل sync workers';
COMMENT ON FUNCTION record_sync_failure IS 'تسجيل فشل مزامنة وزيادة العداد';
COMMENT ON FUNCTION record_sync_success IS 'تسجيل نجاح مزامنة وإعادة تعيين العداد';
COMMENT ON FUNCTION check_circuit_breaker IS 'فحص حالة circuit breaker مع إعادة فتح تلقائية';
