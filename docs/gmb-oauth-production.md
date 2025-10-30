## إعداد OAuth لـ GMB في بيئة الإنتاج (Next.js + Supabase)

هذه الوثيقة تشرح، خطوة بخطوة، كيفية ضبط OAuth المخصص لتوصيل Google My Business في بيئة الإنتاج، باستخدام نفس عميل Google OAuth المستخدم لتسجيل الدخول في Supabase Auth، مع ضمان عدم حدوث redirect_uri_mismatch.

### 1) اختيار النطاق الإنتاجي الرسمي (Canonical Domain)
- اختر نطاقًا واحدًا فقط ليكون مرجعًا موحدًا: يوصى بـ `https://nnh.ae` بدون `www`.
- حافظ على الاتساق: جميع القيم في البيئة وGoogle Console يجب أن تطابق هذا النطاق حرفيًا (بما في ذلك البروتوكول وwww من عدمه).

### 2) إعداد متغيرات البيئة (Secrets) في الإنتاج
اضبط القيم التالية في منصة التشغيل التي تستضيف تطبيق Next.js (بيئة الإنتاج):

- NEXT_PUBLIC_BASE_URL = `https://nnh.ae`
- GOOGLE_CLIENT_ID = `<نسخ من Google Console>`
- GOOGLE_CLIENT_SECRET = `<نسخ من Google Console>`
- GOOGLE_REDIRECT_URI = `https://nnh.ae/api/gmb/oauth-callback`

ملاحظات مهمة:
- وجود GOOGLE_REDIRECT_URI إلزامي هنا لأنه يُستخدم في نقطتين:
  - عند إنشاء رابط التفويض في `app/api/gmb/create-auth-url/route.ts`.
  - وعند تبادل الرمز مقابل التوكنز في `app/api/gmb/oauth-callback/route.ts`.
- إذا لم تُضبط GOOGLE_REDIRECT_URI، يعتمد الكود على NEXT_PUBLIC_BASE_URL لبناء القيمة، وأي عدم اتساق يؤدي لخطأ redirect_uri_mismatch.

### 3) ضبط Google Cloud Console (OAuth 2.0 Client)
اذهب إلى: Google Cloud Console → APIs & Services → Credentials → OAuth Client (نفس العميل المعرف في GOOGLE_CLIENT_ID)

- Authorized JavaScript origins:
  - أضف: `https://nnh.ae`

- Authorized redirect URIs: تأكد من وجود جميع هذه المسارات (بدقة):
  - لتسجيل دخول Supabase: `https://nnh.ae/auth/callback`
  - لتدفق GMB المخصص: `https://nnh.ae/api/gmb/oauth-callback`
  - اختياريًا (حسب الحاجة): عناوين Supabase الداخلية التي تظهر لديك في لقطات الشاشة، لكن حافظ على الدقة وعدم التكرار غير الضروري.

نصائح الدقة:
- تجنب مزج `www.` مع غيره دون داع. إذا اخترت `https://nnh.ae`، التزم به.
- لا تضف `/` إضافية في نهاية المسارات.

### 4) إعداد Supabase (للإحاطة فقط)
ملف `supabase/config.toml` لديك مُعد لتسجيل الدخول عبر Google بـ `https://www.nnh.ae/auth/callback`. إن كنت تعتمد نطاق `https://nnh.ae` كمعيار:

- في لوحة Supabase Auth → URL Configuration:
  - Site URL: `https://nnh.ae`
  - Redirect URLs: تضمّن على الأقل: `https://nnh.ae/auth/callback`

ملاحظة: إعداد Supabase هنا يتعلق بتسجيل دخول المستخدم إلى Supabase Auth، وليس تدفق GMB المخصص. تدفق GMB يعتمد على المسار `api/gmb/oauth-callback` ضمن تطبيق Next.js نفسه.

### 5) تحقق بعد الضبط
بعد حفظ الإعدادات، نفّذ هذا السيناريو في الإنتاج:
1. سجل الدخول إلى المنصة (Supabase Auth) عبر النطاق الرسمي `https://nnh.ae`.
2. من صفحة الحسابات: `https://nnh.ae/accounts` اضغط "Connect Account".
3. ستُحوّل إلى Google؛ راقب عنوان `redirect_uri` في شريط العنوان (أو في لوجات السيرفر). يجب أن يكون:
   - `https://nnh.ae/api/gmb/oauth-callback`
4. أكمل التفويض. عند العودة، يجب إنشاء أو تحديث سجل في جدول `gmb_accounts` وتعبئة `refresh_token`.

### 6) استكشاف الأخطاء الشائعة
- redirect_uri_mismatch:
  - تحقق أن GOOGLE_REDIRECT_URI يساوي تمامًا أحد Authorized redirect URIs في Google Console.
  - تحقق أن NEXT_PUBLIC_BASE_URL وGOOGLE_REDIRECT_URI يستخدمان نفس النطاق والبروتوكول.
  - احذف الت duplications غير الضرورية أو الاختلافات (مثل `www.` أو الشرطة المائلة الأخيرة).

- عدم استلام refresh_token:
  - تأكد من أن التدفق يستخدم `access_type=offline` و`prompt=consent` (الكود يفعل ذلك تلقائيًا).
  - جرّب إزالة التفويض السابق من https://myaccount.google.com/permissions ثم أعد الربط.

- فشل تخزين الحالة (state) أو السجلات:
  - راجع جدول `oauth_states` وسياسات RLS. الكود يستخدم `createAdminClient()` للحفظ قبل التفويض.
  - راجع لوجات المسار `POST /api/gmb/create-auth-url` لأي أخطاء إدخال.

### 7) قائمة تحقق سريعة (Production)
- [ ] `NEXT_PUBLIC_BASE_URL = https://nnh.ae`
- [ ] `GOOGLE_REDIRECT_URI = https://nnh.ae/api/gmb/oauth-callback`
- [ ] `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` من نفس عميل Google
- [ ] Google Console يحتوي:
  - [ ] `https://nnh.ae/auth/callback`
  - [ ] `https://nnh.ae/api/gmb/oauth-callback`
- [ ] تسجيل الدخول يعمل، والربط يعيدك إلى `/accounts#success=true`

### 8) مراجع الكود ذات الصلة
- بناء رابط التفويض (يستخدم GOOGLE_REDIRECT_URI أو NEXT_PUBLIC_BASE_URL):
  - `app/api/gmb/create-auth-url/route.ts`
- تبادل الرمز بالتوكنز (نفس `redirect_uri`):
  - `app/api/gmb/oauth-callback/route.ts`

باتّباع هذه الخطوات بدقة، سيُزال خطأ redirect_uri_mismatch ويعمل ربط GMB في الإنتاج بشكل سليم.


