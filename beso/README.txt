========================================
نسخة احتياطية - ملفات Google My Business
GMB Platform Backup
تاريخ النسخ: 29 أكتوبر 2025
========================================

📋 محتويات هذا المجلد:
----------------------

هذا المجلد يحتوي على نسخة احتياطية كاملة من جميع الملفات المتعلقة بـ Google و Google My Business في المشروع.

📁 الهيكل:
-----------

1. api/gmb/ (3 ملفات)
   ├── create-auth-url/route.ts    → إنشاء رابط OAuth
   ├── oauth-callback/route.ts     → استقبال callback من Google
   └── sync/route.ts                → مزامنة البيانات من GMB

2. server/actions/ (4 ملفات)
   ├── accounts.ts      → إدارة حسابات GMB
   ├── locations.ts     → إدارة المواقع
   ├── reviews.ts       → إدارة التقييمات
   └── dashboard.ts     → إحصائيات Dashboard

3. lib/
   ├── hooks/ (2 ملفات)
   │   ├── useOAuthCallbackHandler.ts    → معالجة OAuth
   │   └── useAccountsManagement.ts      → إدارة Accounts
   └── types/
       └── database.ts                    → TypeScript Types

4. components/ (7 ملفات)
   ├── accounts/
   │   ├── AccountCard.tsx
   │   └── NoAccountsPlaceholder.tsx
   ├── locations/
   │   ├── location-card.tsx
   │   └── add-location-dialog.tsx
   └── reviews/
       ├── review-column.tsx
       ├── review-card.tsx
       └── reply-dialog.tsx

5. app/ (4 ملفات)
   ├── dashboard/
   │   ├── accounts/page.tsx
   │   ├── locations/page.tsx
   │   └── reviews/page.tsx
   └── auth/callback/route.ts

6. supabase/migrations/ (4 ملفات SQL)
   ├── 20251029_create_oauth_tables.sql
   ├── 20251029_enable_rls_gmb_accounts.sql
   ├── 20251029_add_user_id_columns.sql
   └── 20251029_enable_rls_policies.sql

7. scripts/ (1 ملف)
   └── 001_create_gmb_schema.sql

========================================
📊 الإحصائيات:
--------------
إجمالي الملفات: ~27 ملف
API Routes: 3
Server Actions: 4
Hooks: 2
Components: 7
Pages: 4
Database Files: 5
Types: 1

========================================
⚠️ ملاحظات مهمة:
-----------------
1. هذه نسخة احتياطية فقط - الملفات الأصلية موجودة في مكانها
2. يمكنك حذف هذا المجلد في أي وقت
3. لا تستخدم هذه الملفات مباشرة - هي للرجوع فقط

========================================
🔑 Environment Variables المطلوبة:
----------------------------------
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
SUPABASE_SERVICE_ROLE_KEY

========================================
