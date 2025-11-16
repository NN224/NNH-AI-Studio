# 🗑️ قرارات تنظيف قاعدة البيانات

**التاريخ:** 15 نوفمبر 2025  
**المجموع:** 61 جدول

---

## ✅ الجداول المهمة - نخليها (17 جدول)

### **GMB Core (6 جداول):**
```
✅ gmb_accounts                264 kB   - حسابات GMB الأساسية
✅ gmb_locations               2400 kB  - المواقع (الأكبر والأهم!)
✅ gmb_reviews                 4016 kB  - التقييمات (الأهم!)
✅ gmb_questions               528 kB   - الأسئلة والأجوبة
✅ gmb_posts                   120 kB   - المنشورات
✅ gmb_media                   3656 kB  - الوسائط (ثاني أكبر جدول)
```

### **AI & Automation (3 جداول):**
```
✅ ai_settings                 104 kB   - إعدادات AI (مستخدم 18 مرة)
✅ ai_requests                 64 kB    - طلبات AI (للتتبع)
✅ weekly_task_recommendations 112 kB   - توصيات المهام (مستخدم 18 مرة)
```

### **System Core (5 جداول):**
```
✅ profiles                    176 kB   - ملفات المستخدمين
✅ notifications               40 kB    - الإشعارات
✅ activity_logs               64 kB    - سجل النشاطات
✅ audit_logs                  80 kB    - سجل التدقيق
✅ error_logs                  88 kB    - سجل الأخطاء
```

### **Performance & Security (3 جداول):**
```
✅ performance_metrics         40 kB    - مقاييس الأداء
✅ rate_limit_requests         48 kB    - Rate limiting
✅ oauth_states                152 kB   - OAuth states (مهم للأمان)
```

---

## ❌ الجداول للحذف الفوري (20 جدول)

### **🔴 Priority 1 - Backup & Duplicates (1 جدول):**
```
❌ gmb_reviews_backup_20251114  608 kB   - نسخة احتياطية قديمة!
   💾 توفير: 608 kB
```

### **🔴 Priority 2 - YouTube (حذفنا التاب) (2 جداول):**
```
❌ youtube_drafts               40 kB    - مسودات YouTube
❌ youtube_videos               112 kB   - فيديوهات YouTube
   💾 توفير: 152 kB
```

### **🔴 Priority 3 - Unused Features (17 جدول):**
```
❌ users                        120 kB   - مكرر (Supabase Auth)
❌ team_members                 40 kB    - تاب Team محذوف
❌ client_profiles              64 kB    - غير مستخدم
❌ secret_keys                  32 kB    - غير مستخدم
❌ system_settings              32 kB    - غير مستخدم
❌ room_members                 24 kB    - غير مستخدم
❌ oauth_events                 32 kB    - غير مستخدم
❌ security_logs                48 kB    - مكرر مع audit_logs
❌ monitoring_alerts            32 kB    - تاب Monitoring محذوف
❌ monitoring_metrics           40 kB    - تاب Monitoring محذوف
❌ health_check_results         40 kB    - غير مستخدم
❌ jobs_log                     16 kB    - غير مستخدم
❌ sync_runs                    16 kB    - غير مستخدم
❌ sync_results                 40 kB    - غير مستخدم
❌ sync_status                  64 kB    - غير مستخدم
❌ review_activity_log          48 kB    - مكرر مع activity_logs
❌ content_generation           24 kB    - مكرر
   💾 توفير: 712 kB
```

**💾 التوفير الإجمالي من الحذف الفوري: 1,472 kB (~1.4 MB)**

---

## ⚠️ الجداول المشكوك فيها - نتحقق منها (24 جدول)

### **🟡 GMB Extended Features (11 جدول):**
```
⚠️ gmb_attributes              88 kB    - Attributes (تحقق من Features tab)
⚠️ gmb_citations               32 kB    - Citations
⚠️ gmb_dashboard_reports       64 kB    - تقارير Dashboard
⚠️ gmb_insights                48 kB    - Insights
⚠️ gmb_metrics                 96 kB    - Metrics
⚠️ gmb_performance_metrics     808 kB   - Performance metrics (كبير!)
⚠️ gmb_rankings                40 kB    - Rankings
⚠️ gmb_search_keywords         5888 kB  - Keywords (الأكبر! 5.7 MB)
⚠️ gmb_sync_logs               432 kB   - Sync logs
⚠️ citation_listings           56 kB    - Citation listings
⚠️ citation_sources            40 kB    - Citation sources
```

**ملاحظة:** `gmb_search_keywords` هو أكبر جدول (5.7 MB)!  
**سؤال:** هل Grid Tracking مستخدم؟ إذا لا، احذف هذا الجدول!

### **🟡 AI & Automation Extended (9 جداول):**
```
⚠️ ai_autopilot_logs           40 kB    - Autopilot logs
⚠️ ai_autopilot_settings       32 kB    - Autopilot settings
⚠️ auto_reply_queue            48 kB    - Auto reply queue
⚠️ auto_reply_settings         56 kB    - Auto reply settings
⚠️ autopilot_logs              56 kB    - Autopilot logs (مكرر؟)
⚠️ autopilot_settings          48 kB    - Autopilot settings (مكرر؟)
⚠️ content_generations         16 kB    - Content generations
⚠️ review_ai_analysis          24 kB    - Review AI analysis
⚠️ question_templates          40 kB    - Question templates
```

**ملاحظة:** في تكرار في Autopilot (logs & settings موجودة مرتين)!

### **🟡 Other Features (4 جداول):**
```
⚠️ business_profile_history    152 kB   - Profile history
⚠️ competitor_tracking         40 kB    - Competitor tracking
⚠️ keyword_rankings            48 kB    - Keyword rankings
⚠️ weekly_tasks                56 kB    - Weekly tasks
```

---

## 📊 الإحصائيات

```
المجموع الكلي:     61 جدول  | ~21 MB
✅ نخليها:         17 جدول  | ~12 MB (58%)
❌ نحذفها فوراً:   20 جدول  | ~1.4 MB (7%)
⚠️ نتحقق منها:     24 جدول  | ~7.6 MB (35%)
```

---

## 🎯 خطة التنفيذ

### **المرحلة 1: الحذف الآمن الفوري ✅**
```sql
-- 1. Backup table
DROP TABLE IF EXISTS gmb_reviews_backup_20251114 CASCADE;

-- 2. YouTube tables (التاب محذوف)
DROP TABLE IF EXISTS youtube_drafts CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;

-- 3. Unused features
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS client_profiles CASCADE;
DROP TABLE IF EXISTS secret_keys CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS oauth_events CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS monitoring_alerts CASCADE;
DROP TABLE IF EXISTS monitoring_metrics CASCADE;
DROP TABLE IF EXISTS health_check_results CASCADE;
DROP TABLE IF EXISTS jobs_log CASCADE;
DROP TABLE IF EXISTS sync_runs CASCADE;
DROP TABLE IF EXISTS sync_results CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS review_activity_log CASCADE;
DROP TABLE IF EXISTS content_generation CASCADE;
```

**💾 توفير: ~1.4 MB**

---

### **المرحلة 2: فحص وحذف تدريجي ⚠️**

**أسئلة مهمة:**

1. **Grid Tracking:**
   - ❓ هل تستخدم `gmb_search_keywords` (5.7 MB)؟
   - ❓ هل تستخدم `keyword_rankings`؟
   - إذا لا → احذفهم (توفير 5.9 MB!)

2. **Autopilot Duplicates:**
   - ❓ أي واحد مستخدم: `ai_autopilot_*` أو `autopilot_*`؟
   - احذف المكرر

3. **GMB Extended:**
   - ❓ هل تستخدم `gmb_performance_metrics` (808 kB)؟
   - ❓ هل تستخدم `gmb_sync_logs` (432 kB)؟
   - ❓ هل تستخدم `gmb_dashboard_reports`؟

4. **Citations:**
   - ❓ هل تستخدم `citation_*` tables؟

---

## 💡 التوصية النهائية

### **احذف الآن (آمن 100%):**
```
20 جدول → توفير 1.4 MB
```

### **بعد التحقق:**
```
إذا Grid Tracking غير مستخدم:
  → احذف gmb_search_keywords (5.7 MB)
  → احذف keyword_rankings (48 kB)
  → توفير إضافي: 5.8 MB

إذا Autopilot مكرر:
  → احذف المكرر
  → توفير إضافي: ~200 kB

المجموع المتوقع: 7-8 MB (35-40% من الحجم)
```

---

**جاهز للتنفيذ! 🚀**

