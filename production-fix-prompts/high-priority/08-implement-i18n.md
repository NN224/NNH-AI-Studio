# 🟠 HIGH PRIORITY: Complete i18n Implementation Plan

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## 📋 ملخص المهمة

**Issue ID:** HIGH-008
**Severity:** 🟠 HIGH - UX / Internationalization / SEO
**Priority:** P1
**Estimated Time:** 16-20 ساعة
**Languages:** English (en) | العربية (ar)

---

## 🎯 الهدف النهائي

تحويل التطبيق بالكامل لدعم تعدد اللغات (English/Arabic) بشكل صحيح:

- ✅ فصل كامل بين اللغتين (لا خلط)
- ✅ SEO محسّن لكل لغة
- ✅ RTL/LTR صحيح
- ✅ Meta tags ديناميكية
- ✅ URL structure صحيح (`/en/...` و `/ar/...`)

---

# 📚 المرحلة 1: تحليل الوضع الحالي

## 1.1 فحص الملفات الموجودة

```bash
# قبل البدء، افحص ملفات الترجمة الحالية:
cat messages/en.json | head -100
cat messages/ar.json | head -100

# ابحث عن النصوص المكتوبة مباشرة:
grep -r "إعدادات\|تخصيص\|مراجعات" components/ --include="*.tsx"
grep -r "Settings\|Configure\|Reviews" components/ --include="*.tsx" | grep -v "import\|from\|//"
```

## 1.2 الملفات المتأثرة (بالترتيب)

### 🔴 Critical - نصوص عربية ثابتة:

| #   | الملف                                                 | عدد النصوص | الأولوية |
| --- | ----------------------------------------------------- | ---------- | -------- |
| 1   | `components/reviews/ReviewAISettings.tsx`             | ~12        | P0       |
| 2   | `components/questions/QuestionAISettings.tsx`         | ~10        | P0       |
| 3   | `components/settings/ai-settings-form.tsx`            | ~20        | P0       |
| 4   | `components/error-boundary/global-error-boundary.tsx` | ~8         | P0       |

### 🟠 High - نصوص إنجليزية ثابتة:

| #   | الملف                                                | عدد النصوص | الأولوية |
| --- | ---------------------------------------------------- | ---------- | -------- |
| 5   | `components/media/MediaUploader.tsx`                 | ~6         | P1       |
| 6   | `components/sidebar.tsx`                             | ~15        | P1       |
| 7   | `components/dashboard/lazy-dashboard-components.tsx` | ~4         | P1       |
| 8   | `components/home/*.tsx`                              | ~30        | P1       |

### 🟡 Medium - باقي الملفات:

| #   | الملف                               | عدد النصوص | الأولوية |
| --- | ----------------------------------- | ---------- | -------- |
| 9   | `components/locations/*.tsx`        | ~25        | P2       |
| 10  | `components/analytics/*.tsx`        | ~15        | P2       |
| 11  | `app/[locale]/(dashboard)/**/*.tsx` | ~40        | P2       |
| 12  | `app/[locale]/(marketing)/**/*.tsx` | ~50        | P2       |

---

# 📚 المرحلة 2: هيكلة ملفات الترجمة

## 2.1 هيكل ملف `messages/en.json`

```json
{
  "Metadata": {
    "siteName": "NNH AI Studio",
    "siteDescription": "AI-powered Google My Business management platform",
    "keywords": "GMB, Google My Business, AI, Reviews, Local SEO"
  },

  "Common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Try again",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "confirm": "Confirm",
    "success": "Success",
    "failed": "Failed",
    "yes": "Yes",
    "no": "No",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import",
    "refresh": "Refresh",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "submit": "Submit",
    "required": "Required",
    "optional": "Optional"
  },

  "Navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "locations": "Locations",
    "reviews": "Reviews",
    "questions": "Q&A",
    "posts": "Posts",
    "media": "Media",
    "analytics": "Analytics",
    "settings": "Settings",
    "automation": "Automation",
    "products": "Products"
  },

  "Auth": {
    "login": "Login",
    "logout": "Logout",
    "signup": "Sign Up",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "rememberMe": "Remember me",
    "loginWithGoogle": "Continue with Google",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?"
  },

  "Dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {name}!",
    "overview": "Overview",
    "totalReviews": "Total Reviews",
    "avgRating": "Average Rating",
    "responseRate": "Response Rate",
    "pendingQuestions": "Pending Questions",
    "recentActivity": "Recent Activity",
    "quickActions": "Quick Actions"
  },

  "Reviews": {
    "title": "Reviews",
    "allReviews": "All Reviews",
    "pending": "Pending",
    "replied": "Replied",
    "noReviews": "No reviews yet",
    "respondTo": "Respond to Review",
    "generateResponse": "Generate AI Response",
    "markAsReplied": "Mark as Replied",
    "filterByRating": "Filter by Rating",
    "filterByLocation": "Filter by Location",
    "sortBy": "Sort by",
    "newest": "Newest",
    "oldest": "Oldest",
    "highestRating": "Highest Rating",
    "lowestRating": "Lowest Rating",

    "AISettings": {
      "title": "AI Settings for Reviews",
      "description": "Customize how the system automatically replies to customer reviews",
      "enabled": "AI Auto-Reply Enabled",
      "disabled": "AI Auto-Reply Disabled",
      "tone": "Response Tone",
      "tones": {
        "professional": "Professional",
        "friendly": "Friendly",
        "apologetic": "Apologetic",
        "marketing": "Marketing"
      },
      "includeBusinessName": "Include Business Name",
      "signatureText": "Signature Text",
      "maxLength": "Maximum Response Length",
      "saveSettings": "Save Settings"
    }
  },

  "Questions": {
    "title": "Questions & Answers",
    "allQuestions": "All Questions",
    "answered": "Answered",
    "unanswered": "Unanswered",
    "noQuestions": "No questions yet",
    "answerQuestion": "Answer Question",
    "generateAnswer": "Generate AI Answer",
    "markAsAnswered": "Mark as Answered",

    "AISettings": {
      "title": "AI Settings for Q&A",
      "description": "Configure automatic question answering",
      "autoAnswer": "Auto-Answer Questions",
      "categories": {
        "hours": "Business Hours",
        "location": "Location & Directions",
        "services": "Services & Products",
        "pricing": "Pricing",
        "general": "General Questions"
      }
    }
  },

  "Locations": {
    "title": "Locations",
    "allLocations": "All Locations",
    "addLocation": "Add Location",
    "editLocation": "Edit Location",
    "deleteLocation": "Delete Location",
    "noLocations": "No locations connected",
    "connectGMB": "Connect Google My Business",
    "syncNow": "Sync Now",
    "lastSync": "Last synced: {time}",
    "status": {
      "active": "Active",
      "inactive": "Inactive",
      "suspended": "Suspended"
    }
  },

  "Media": {
    "title": "Media",
    "photos": "Photos",
    "videos": "Videos",
    "upload": "Upload",
    "delete": "Delete",
    "selectLocation": "Select a location to upload media",
    "dropActive": "Drop the images here",
    "dropInactive": "Drag and drop files here, or click to select",
    "uploading": "Uploading...",
    "uploadSuccess": "Upload successful",
    "uploadFailed": "Upload failed",
    "maxFileSize": "Maximum file size: {size}MB",
    "allowedFormats": "Allowed formats: {formats}"
  },

  "Analytics": {
    "title": "Analytics",
    "overview": "Overview",
    "views": "Views",
    "clicks": "Clicks",
    "calls": "Calls",
    "directions": "Direction Requests",
    "websiteVisits": "Website Visits",
    "dateRange": "Date Range",
    "compareWith": "Compare with",
    "previousPeriod": "Previous Period",
    "lastYear": "Last Year"
  },

  "Settings": {
    "title": "Settings",
    "account": "Account",
    "notifications": "Notifications",
    "billing": "Billing",
    "team": "Team",
    "integrations": "Integrations",
    "api": "API",
    "security": "Security",

    "AI": {
      "title": "AI Configuration",
      "provider": "AI Provider",
      "providers": {
        "openai": "OpenAI (GPT-4)",
        "anthropic": "Anthropic (Claude)",
        "google": "Google (Gemini)"
      },
      "apiKey": "API Key",
      "testConnection": "Test Connection",
      "connected": "Connected",
      "notConnected": "Not Connected"
    }
  },

  "Errors": {
    "pageNotFound": "Page Not Found",
    "pageNotFoundDesc": "The page you're looking for doesn't exist.",
    "serverError": "Server Error",
    "serverErrorDesc": "Something went wrong. Please try again later.",
    "unauthorized": "Unauthorized",
    "unauthorizedDesc": "You don't have permission to access this page.",
    "networkError": "Network Error",
    "networkErrorDesc": "Please check your internet connection.",
    "goHome": "Go to Homepage",
    "tryAgain": "Try Again",
    "contactSupport": "Contact Support"
  },

  "Footer": {
    "copyright": "© {year} NNH AI Studio. All rights reserved.",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "support": "Support"
  },

  "SEO": {
    "home": {
      "title": "NNH AI Studio - AI-Powered GMB Management",
      "description": "Manage your Google My Business listings with AI. Automate review responses, Q&A, and boost your local SEO."
    },
    "dashboard": {
      "title": "Dashboard - NNH AI Studio",
      "description": "Your GMB management dashboard. Monitor reviews, questions, and analytics."
    },
    "reviews": {
      "title": "Reviews Management - NNH AI Studio",
      "description": "Manage and respond to customer reviews with AI assistance."
    },
    "locations": {
      "title": "Locations - NNH AI Studio",
      "description": "Manage all your Google My Business locations in one place."
    }
  }
}
```

## 2.2 هيكل ملف `messages/ar.json`

```json
{
  "Metadata": {
    "siteName": "NNH AI Studio",
    "siteDescription": "منصة إدارة Google My Business بالذكاء الاصطناعي",
    "keywords": "جوجل ماي بزنس، مراجعات، ذكاء اصطناعي، SEO محلي"
  },

  "Common": {
    "loading": "جاري التحميل...",
    "error": "حدث خطأ",
    "retry": "حاول مرة أخرى",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "close": "إغلاق",
    "confirm": "تأكيد",
    "success": "تم بنجاح",
    "failed": "فشل",
    "yes": "نعم",
    "no": "لا",
    "search": "بحث",
    "filter": "تصفية",
    "export": "تصدير",
    "import": "استيراد",
    "refresh": "تحديث",
    "back": "رجوع",
    "next": "التالي",
    "previous": "السابق",
    "submit": "إرسال",
    "required": "مطلوب",
    "optional": "اختياري"
  },

  "Navigation": {
    "home": "الرئيسية",
    "dashboard": "لوحة التحكم",
    "locations": "المواقع",
    "reviews": "المراجعات",
    "questions": "الأسئلة والأجوبة",
    "posts": "المنشورات",
    "media": "الوسائط",
    "analytics": "التحليلات",
    "settings": "الإعدادات",
    "automation": "الأتمتة",
    "products": "المنتجات"
  },

  "Auth": {
    "login": "تسجيل الدخول",
    "logout": "تسجيل الخروج",
    "signup": "إنشاء حساب",
    "forgotPassword": "نسيت كلمة المرور؟",
    "resetPassword": "إعادة تعيين كلمة المرور",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "rememberMe": "تذكرني",
    "loginWithGoogle": "المتابعة مع Google",
    "noAccount": "ليس لديك حساب؟",
    "hasAccount": "لديك حساب بالفعل؟"
  },

  "Dashboard": {
    "title": "لوحة التحكم",
    "welcome": "مرحباً بعودتك، {name}!",
    "overview": "نظرة عامة",
    "totalReviews": "إجمالي المراجعات",
    "avgRating": "متوسط التقييم",
    "responseRate": "معدل الرد",
    "pendingQuestions": "الأسئلة المعلقة",
    "recentActivity": "النشاط الأخير",
    "quickActions": "إجراءات سريعة"
  },

  "Reviews": {
    "title": "المراجعات",
    "allReviews": "جميع المراجعات",
    "pending": "بانتظار الرد",
    "replied": "تم الرد",
    "noReviews": "لا توجد مراجعات بعد",
    "respondTo": "الرد على المراجعة",
    "generateResponse": "توليد رد بالذكاء الاصطناعي",
    "markAsReplied": "تحديد كمُجاب",
    "filterByRating": "تصفية حسب التقييم",
    "filterByLocation": "تصفية حسب الموقع",
    "sortBy": "ترتيب حسب",
    "newest": "الأحدث",
    "oldest": "الأقدم",
    "highestRating": "الأعلى تقييماً",
    "lowestRating": "الأقل تقييماً",

    "AISettings": {
      "title": "إعدادات الذكاء الاصطناعي للمراجعات",
      "description": "تخصيص كيفية رد النظام تلقائياً على مراجعات العملاء",
      "enabled": "الرد التلقائي مُفعّل",
      "disabled": "الرد التلقائي مُعطّل",
      "tone": "نبرة الرد",
      "tones": {
        "professional": "احترافي",
        "friendly": "ودي",
        "apologetic": "اعتذاري",
        "marketing": "تسويقي"
      },
      "includeBusinessName": "تضمين اسم النشاط التجاري",
      "signatureText": "نص التوقيع",
      "maxLength": "الحد الأقصى لطول الرد",
      "saveSettings": "حفظ الإعدادات"
    }
  },

  "Questions": {
    "title": "الأسئلة والأجوبة",
    "allQuestions": "جميع الأسئلة",
    "answered": "تمت الإجابة",
    "unanswered": "بدون إجابة",
    "noQuestions": "لا توجد أسئلة بعد",
    "answerQuestion": "إجابة السؤال",
    "generateAnswer": "توليد إجابة بالذكاء الاصطناعي",
    "markAsAnswered": "تحديد كمُجاب",

    "AISettings": {
      "title": "إعدادات الذكاء الاصطناعي للأسئلة",
      "description": "ضبط الإجابة التلقائية على الأسئلة",
      "autoAnswer": "الإجابة التلقائية على الأسئلة",
      "categories": {
        "hours": "ساعات العمل",
        "location": "الموقع والاتجاهات",
        "services": "الخدمات والمنتجات",
        "pricing": "الأسعار",
        "general": "أسئلة عامة"
      }
    }
  },

  "Locations": {
    "title": "المواقع",
    "allLocations": "جميع المواقع",
    "addLocation": "إضافة موقع",
    "editLocation": "تعديل الموقع",
    "deleteLocation": "حذف الموقع",
    "noLocations": "لا توجد مواقع متصلة",
    "connectGMB": "ربط Google My Business",
    "syncNow": "مزامنة الآن",
    "lastSync": "آخر مزامنة: {time}",
    "status": {
      "active": "نشط",
      "inactive": "غير نشط",
      "suspended": "موقوف"
    }
  },

  "Media": {
    "title": "الوسائط",
    "photos": "الصور",
    "videos": "الفيديوهات",
    "upload": "رفع",
    "delete": "حذف",
    "selectLocation": "اختر موقعاً لرفع الوسائط",
    "dropActive": "أفلت الصور هنا",
    "dropInactive": "اسحب وأفلت الملفات هنا، أو انقر للاختيار",
    "uploading": "جاري الرفع...",
    "uploadSuccess": "تم الرفع بنجاح",
    "uploadFailed": "فشل الرفع",
    "maxFileSize": "الحجم الأقصى للملف: {size} ميجابايت",
    "allowedFormats": "الصيغ المسموحة: {formats}"
  },

  "Analytics": {
    "title": "التحليلات",
    "overview": "نظرة عامة",
    "views": "المشاهدات",
    "clicks": "النقرات",
    "calls": "المكالمات",
    "directions": "طلبات الاتجاهات",
    "websiteVisits": "زيارات الموقع",
    "dateRange": "النطاق الزمني",
    "compareWith": "مقارنة مع",
    "previousPeriod": "الفترة السابقة",
    "lastYear": "العام الماضي"
  },

  "Settings": {
    "title": "الإعدادات",
    "account": "الحساب",
    "notifications": "الإشعارات",
    "billing": "الفواتير",
    "team": "الفريق",
    "integrations": "التكاملات",
    "api": "API",
    "security": "الأمان",

    "AI": {
      "title": "إعدادات الذكاء الاصطناعي",
      "provider": "مزود الذكاء الاصطناعي",
      "providers": {
        "openai": "OpenAI (GPT-4)",
        "anthropic": "Anthropic (Claude)",
        "google": "Google (Gemini)"
      },
      "apiKey": "مفتاح API",
      "testConnection": "اختبار الاتصال",
      "connected": "متصل",
      "notConnected": "غير متصل"
    }
  },

  "Errors": {
    "pageNotFound": "الصفحة غير موجودة",
    "pageNotFoundDesc": "الصفحة التي تبحث عنها غير موجودة.",
    "serverError": "خطأ في الخادم",
    "serverErrorDesc": "حدث خطأ ما. يرجى المحاولة لاحقاً.",
    "unauthorized": "غير مصرح",
    "unauthorizedDesc": "ليس لديك صلاحية للوصول إلى هذه الصفحة.",
    "networkError": "خطأ في الشبكة",
    "networkErrorDesc": "يرجى التحقق من اتصالك بالإنترنت.",
    "goHome": "الذهاب للرئيسية",
    "tryAgain": "حاول مرة أخرى",
    "contactSupport": "تواصل مع الدعم"
  },

  "Footer": {
    "copyright": "© {year} NNH AI Studio. جميع الحقوق محفوظة.",
    "privacy": "سياسة الخصوصية",
    "terms": "شروط الخدمة",
    "support": "الدعم"
  },

  "SEO": {
    "home": {
      "title": "NNH AI Studio - إدارة GMB بالذكاء الاصطناعي",
      "description": "أدر قوائم Google My Business بالذكاء الاصطناعي. أتمتة الردود على المراجعات والأسئلة وتحسين SEO المحلي."
    },
    "dashboard": {
      "title": "لوحة التحكم - NNH AI Studio",
      "description": "لوحة تحكم إدارة GMB. راقب المراجعات والأسئلة والتحليلات."
    },
    "reviews": {
      "title": "إدارة المراجعات - NNH AI Studio",
      "description": "إدارة والرد على مراجعات العملاء بمساعدة الذكاء الاصطناعي."
    },
    "locations": {
      "title": "المواقع - NNH AI Studio",
      "description": "إدارة جميع مواقع Google My Business في مكان واحد."
    }
  }
}
```

---

# 📚 المرحلة 3: تحديث الكومبوننتات

## 3.1 القاعدة الأساسية للتحويل

### ❌ قبل (خطأ):

```tsx
export function ReviewAISettings() {
  return (
    <SheetTitle>إعدادات AI للمراجعات</SheetTitle>
    <p>تخصيص كيفية رد النظام تلقائياً</p>
  );
}
```

### ✅ بعد (صحيح):

```tsx
"use client";

import { useTranslations } from "next-intl";

export function ReviewAISettings() {
  const t = useTranslations("Reviews.AISettings");

  return (
    <>
      <SheetTitle>{t("title")}</SheetTitle>
      <p>{t("description")}</p>
    </>
  );
}
```

## 3.2 التعامل مع المتغيرات

```tsx
// للنصوص مع متغيرات
const t = useTranslations("Dashboard");

// في messages/en.json: "welcome": "Welcome back, {name}!"
// في messages/ar.json: "welcome": "مرحباً بعودتك، {name}!"

<p>{t("welcome", { name: user.name })}</p>;
```

## 3.3 التعامل مع الـ Plurals

```tsx
// في messages/en.json:
// "itemCount": "{count, plural, =0 {No items} =1 {1 item} other {# items}}"

// في messages/ar.json:
// "itemCount": "{count, plural, =0 {لا عناصر} =1 {عنصر واحد} =2 {عنصران} few {# عناصر} many {# عنصر} other {# عنصر}}"

<p>{t("itemCount", { count: items.length })}</p>
```

---

# 📚 المرحلة 4: SEO & Meta Tags

## 4.1 تحديث Layout لكل لغة

```tsx
// app/[locale]/layout.tsx
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("siteName"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("siteDescription"),
    keywords: t("keywords"),
    openGraph: {
      title: t("siteName"),
      description: t("siteDescription"),
      locale: locale === "ar" ? "ar_AE" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_AE",
    },
    alternates: {
      canonical: `https://nnh.ae/${locale}`,
      languages: {
        en: "https://nnh.ae/en",
        ar: "https://nnh.ae/ar",
      },
    },
  };
}
```

## 4.2 تحديث كل صفحة

```tsx
// app/[locale]/(dashboard)/reviews/page.tsx
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "SEO.reviews" });

  return {
    title: t("title"),
    description: t("description"),
  };
}
```

## 4.3 إضافة hreflang Tags

```tsx
// في head أو layout
<link rel="alternate" hrefLang="en" href="https://nnh.ae/en" />
<link rel="alternate" hrefLang="ar" href="https://nnh.ae/ar" />
<link rel="alternate" hrefLang="x-default" href="https://nnh.ae/en" />
```

---

# 📚 المرحلة 5: RTL Support

## 5.1 تحديث HTML Direction

```tsx
// app/[locale]/layout.tsx
export default function RootLayout({ children, params: { locale } }: Props) {
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={direction}>
      <body
        className={cn(fonts.className, direction === "rtl" && "font-arabic")}
      >
        {children}
      </body>
    </html>
  );
}
```

## 5.2 CSS للـ RTL

```css
/* styles/globals.css */

/* RTL specific styles */
[dir="rtl"] {
  --direction: rtl;
}

[dir="ltr"] {
  --direction: ltr;
}

/* Flip icons and elements */
[dir="rtl"] .flip-rtl {
  transform: scaleX(-1);
}

/* Text alignment */
[dir="rtl"] .text-start {
  text-align: right;
}

[dir="ltr"] .text-start {
  text-align: left;
}
```

## 5.3 Tailwind RTL Classes

```tsx
// استخدم الـ logical properties
<div className="ps-4">  {/* padding-inline-start */}
<div className="pe-4">  {/* padding-inline-end */}
<div className="ms-4">  {/* margin-inline-start */}
<div className="me-4">  {/* margin-inline-end */}
<div className="text-start">  {/* text-align based on direction */}
<div className="text-end">
```

---

# 📚 المرحلة 6: خطوات التنفيذ بالترتيب

## الخطوة 1: تحديث ملفات الترجمة (2-3 ساعات)

```bash
# 1. نسخ احتياطي
cp messages/en.json messages/en.json.backup
cp messages/ar.json messages/ar.json.backup

# 2. تحديث en.json بالهيكل الكامل أعلاه
# 3. تحديث ar.json بالهيكل الكامل أعلاه
# 4. التحقق من صحة JSON
npx jsonlint messages/en.json
npx jsonlint messages/ar.json
```

## الخطوة 2: تحديث الكومبوننتات الحرجة (4-5 ساعات)

```bash
# بالترتيب:
1. components/reviews/ReviewAISettings.tsx
2. components/questions/QuestionAISettings.tsx
3. components/settings/ai-settings-form.tsx
4. components/error-boundary/global-error-boundary.tsx
```

## الخطوة 3: تحديث باقي الكومبوننتات (4-5 ساعات)

```bash
5. components/media/MediaUploader.tsx
6. components/sidebar.tsx
7. components/dashboard/*.tsx
8. components/home/*.tsx
```

## الخطوة 4: SEO & Meta Tags (2-3 ساعات)

```bash
# تحديث جميع الصفحات:
app/[locale]/layout.tsx
app/[locale]/(dashboard)/*/page.tsx
app/[locale]/(marketing)/*/page.tsx
```

## الخطوة 5: RTL Polish (2-3 ساعات)

```bash
# مراجعة وإصلاح:
- Icons direction
- Spacing (margins/paddings)
- Text alignment
- Form fields direction
```

## الخطوة 6: الاختبار (2-3 ساعات)

```bash
# 1. Build test
npm run build

# 2. Manual testing
- Open /en/* pages - verify all English
- Open /ar/* pages - verify all Arabic
- Test locale switcher
- Test RTL layout
- Test SEO tags (inspect source)

# 3. Lighthouse audit for both locales
```

---

# ✅ Acceptance Criteria (معايير القبول)

## Language Separation:

- [ ] لا يوجد نص عربي ثابت في الكود
- [ ] لا يوجد نص إنجليزي ثابت في الكود
- [ ] جميع النصوص تأتي من `useTranslations` أو `getTranslations`
- [ ] ملفات الترجمة كاملة ومتطابقة في المفاتيح

## SEO:

- [ ] كل صفحة لديها `<title>` مترجم
- [ ] كل صفحة لديها `<meta description>` مترجم
- [ ] `hreflang` tags موجودة
- [ ] `og:locale` صحيح لكل لغة
- [ ] `canonical` URLs صحيحة

## RTL:

- [ ] `dir="rtl"` على `<html>` للعربية
- [ ] `lang="ar"` على `<html>` للعربية
- [ ] Icons تنعكس بشكل صحيح
- [ ] Spacing صحيح (ps/pe بدلاً من pl/pr)
- [ ] Text alignment صحيح

## Quality:

- [ ] `npm run build` ينجح بدون errors
- [ ] `npm run lint` بدون errors جديدة
- [ ] لا توجد missing translation warnings
- [ ] الـ UI يبدو متناسق في اللغتين

---

# 🧪 Testing Checklist

```bash
# Automated
npm run build
npm run lint

# Manual - English
[ ] /en/home - All text English
[ ] /en/dashboard - All text English
[ ] /en/reviews - All text English
[ ] /en/settings - All text English

# Manual - Arabic
[ ] /ar/home - All text Arabic
[ ] /ar/dashboard - All text Arabic
[ ] /ar/reviews - All text Arabic
[ ] /ar/settings - All text Arabic

# RTL Check
[ ] Arabic pages are RTL
[ ] Icons flip correctly
[ ] Forms are RTL
[ ] Tables are RTL

# SEO Check (View Page Source)
[ ] <html lang="en"> or <html lang="ar">
[ ] <title> is translated
[ ] <meta description> is translated
[ ] hreflang links present
```

---

# 📚 الملفات للتحديث (Checklist)

## ملفات الترجمة:

- [ ] `messages/en.json` - Updated with full structure
- [ ] `messages/ar.json` - Updated with full structure

## الكومبوننتات:

- [ ] `components/reviews/ReviewAISettings.tsx`
- [ ] `components/questions/QuestionAISettings.tsx`
- [ ] `components/settings/ai-settings-form.tsx`
- [ ] `components/error-boundary/global-error-boundary.tsx`
- [ ] `components/media/MediaUploader.tsx`
- [ ] `components/sidebar.tsx`
- [ ] `components/dashboard/lazy-dashboard-components.tsx`
- [ ] `components/home/*.tsx` (all files)
- [ ] `components/locations/*.tsx` (relevant files)

## الصفحات:

- [ ] `app/[locale]/layout.tsx`
- [ ] `app/[locale]/(dashboard)/layout.tsx`
- [ ] `app/[locale]/(dashboard)/reviews/page.tsx`
- [ ] `app/[locale]/(dashboard)/questions/page.tsx`
- [ ] `app/[locale]/(dashboard)/settings/page.tsx`
- [ ] `app/[locale]/(marketing)/page.tsx`

## Styles:

- [ ] `styles/globals.css` - RTL styles

---

**Status:** 🟠 NOT STARTED
**Estimated Time:** 16-20 hours
**Priority:** P1 - HIGH

---

## 🚨 تحذيرات هامة

1. **لا تحذف نصوص بدون استبدالها** - كل نص يُحذف يجب أن يُستبدل بـ `t('key')`
2. **تأكد من تطابق المفاتيح** - نفس المفاتيح في en.json و ar.json
3. **اختبر بعد كل ملف** - `npm run build` بعد كل تعديل
4. **لا تنسى Server Components** - استخدم `getTranslations` بدلاً من `useTranslations`
5. **الـ RTL ليس مجرد direction** - راجع spacing وicons أيضاً
