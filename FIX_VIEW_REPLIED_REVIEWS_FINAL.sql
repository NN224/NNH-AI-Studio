-- 🔧 إصلاح نهائي لـ v_dashboard_stats

-- 1. حذف الـ View القديم
DROP VIEW IF EXISTS v_dashboard_stats CASCADE;

-- 2. إنشاء View محدث يستخدم has_reply بشكل صحيح
CREATE OR REPLACE VIEW v_dashboard_stats AS
WITH location_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT l.id) AS total_locations,
    SUM(l.review_count) AS total_reviews_from_locations,
    AVG(l.calculated_response_rate) AS avg_response_rate
  FROM gmb_locations l
  WHERE l.is_active = true
  GROUP BY l.user_id
),
review_stats AS (
  SELECT 
    r.user_id,
    COUNT(DISTINCT r.id) AS total_reviews,
    AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL AND r.rating > 0) AS avg_rating,
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = false OR r.has_reply IS NULL) AS pending_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days') AS recent_reviews,
    -- ✅ استخدام has_reply مباشرة
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true) AS replied_reviews
  FROM gmb_reviews r
  WHERE r.rating IS NOT NULL
  GROUP BY r.user_id
),
question_stats AS (
  SELECT 
    q.user_id,
    COUNT(DISTINCT q.id) FILTER (WHERE q.answer_status = 'pending' OR q.answer_text IS NULL) AS pending_questions
  FROM gmb_questions q
  GROUP BY q.user_id
)
SELECT 
  COALESCE(ls.user_id, rs.user_id, qs.user_id) AS user_id,
  COALESCE(ls.total_locations, 0) AS total_locations,
  COALESCE(rs.total_reviews, 0) AS total_reviews,
  COALESCE(rs.avg_rating, 0) AS avg_rating,
  COALESCE(rs.pending_reviews, 0) AS pending_reviews,
  COALESCE(rs.replied_reviews, 0) AS replied_reviews,
  COALESCE(qs.pending_questions, 0) AS pending_questions,
  COALESCE(rs.recent_reviews, 0) AS recent_reviews,
  COALESCE(ls.avg_response_rate, 0) AS avg_response_rate,
  CASE 
    WHEN COALESCE(rs.total_reviews, 0) > 0 THEN 
      ROUND((COALESCE(rs.replied_reviews, 0)::NUMERIC / rs.total_reviews::NUMERIC) * 100, 2)
    ELSE 0
  END AS calculated_response_rate
FROM location_stats ls
FULL JOIN review_stats rs ON ls.user_id = rs.user_id
FULL JOIN question_stats qs ON COALESCE(ls.user_id, rs.user_id) = qs.user_id;

-- 3. منح الصلاحيات
GRANT SELECT ON v_dashboard_stats TO authenticated;
GRANT SELECT ON v_dashboard_stats TO service_role;

-- 4. التحقق من النتيجة
SELECT 
  'After Fix' as status,
  user_id,
  total_reviews,
  replied_reviews,
  calculated_response_rate
FROM v_dashboard_stats
WHERE total_reviews > 0
ORDER BY user_id
LIMIT 10;

-- 5. مقارنة مع البيانات الفعلية
WITH actual_stats AS (
  SELECT 
    user_id,
    COUNT(*) as actual_total,
    COUNT(*) FILTER (WHERE has_reply = true) as actual_replied,
    ROUND(COUNT(*) FILTER (WHERE has_reply = true)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as actual_rate
  FROM gmb_reviews
  WHERE rating IS NOT NULL
  GROUP BY user_id
)
SELECT 
  a.user_id,
  a.actual_total,
  v.total_reviews as view_total,
  a.actual_replied,
  v.replied_reviews as view_replied,
  a.actual_rate,
  v.calculated_response_rate as view_rate,
  CASE 
    WHEN a.actual_replied = v.replied_reviews THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM actual_stats a
JOIN v_dashboard_stats v ON a.user_id = v.user_id
ORDER BY a.user_id;
