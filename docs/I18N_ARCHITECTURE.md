# Internationalization (i18n) Architecture

## Overview

This document provides a comprehensive exploration of the i18n implementation in NNH AI Studio, covering language switching, translation files, locale-aware routing, and best practices.

---

## 🏗️ Architecture Components

### 1. Core Configuration Files

#### **i18n.ts** - Central Configuration

```typescript
// Location: /i18n.ts
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const validLocale =
    locale && locales.includes(locale as Locale) ? locale : "en";

  return {
    locale: validLocale as string,
    messages: (await import(`./messages/${validLocale}.json`)).default,
    timeZone: "Asia/Dubai",
    now: new Date(),
  };
});
```

**Key Features:**

- Defines supported locales: English (`en`) and Arabic (`ar`)
- Provides type-safe locale definitions
- Dynamically imports translation messages
- Sets timezone to Asia/Dubai
- Fallback to English if invalid locale

#### **next.config.mjs** - Next.js Integration

```javascript
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n.ts");

export default withSentryConfig(withNextIntl(withBundleAnalyzer(nextConfig)), {...});
```

**Purpose:**

- Wraps Next.js config with `next-intl` plugin
- Enables automatic locale detection and routing
- Integrates with build process

---

## 🛣️ Routing Architecture

### Middleware-Based Routing

**File:** `/middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  // 1. Handle i18n routing first
  const handleI18nRouting = createIntlMiddleware({
    locales,
    defaultLocale: 'en',
  });
  const i18nResponse = handleI18nRouting(request);

  // 2. Extract locale from pathname
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split('/')[1] || 'en';

  // 3. Protected route authentication
  const protectedPaths = ['/dashboard', '/reviews', '/home', ...];
  const isProtectedRoute = protectedPaths.some(path => pathname.includes(path));

  if (isProtectedRoute) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }
  }

  // 4. Redirect authenticated users from auth pages
  const authPaths = ['/auth/login', '/auth/signup'];
  const isAuthRoute = authPaths.some(path => pathname.includes(path));

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return i18nResponse || response;
}
```

**Flow:**

1. **i18n Routing:** Handles locale detection and URL rewriting
2. **Locale Extraction:** Gets current locale from URL path
3. **Auth Protection:** Redirects unauthenticated users to login (preserving locale)
4. **Auth Redirect:** Redirects authenticated users away from login/signup
5. **Response:** Returns i18n-aware response

**Matcher Configuration:**

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- Excludes static files, images, and API routes
- Applies to all other routes

---

## 📁 File Structure

```
app/
├── layout.tsx                 # Root layout (no locale)
├── [locale]/                  # Locale-specific routes
│   ├── layout.tsx            # Locale layout with NextIntlClientProvider
│   ├── page.tsx              # Landing page
│   ├── landing.tsx           # Landing page component
│   ├── home/
│   │   └── page.tsx          # Authenticated home page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset/page.tsx
│   └── (dashboard)/          # Protected dashboard routes
│       ├── dashboard/
│       ├── reviews/
│       ├── posts/
│       └── ...
messages/
├── en.json                    # English translations (523 lines)
└── ar.json                    # Arabic translations (523 lines)
```

---

## 🌐 Layout Hierarchy

### Root Layout (`/app/layout.tsx`)

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "NNH AI Studio - Google My Business & YouTube Management Platform",
  description: "Manage your Google My Business locations...",
  icons: {...},
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html className="dark" lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
```

**Responsibilities:**

- Global metadata (SEO)
- Dark mode class
- Analytics integration
- Base HTML structure

### Locale Layout (`/app/[locale]/layout.tsx`)

```typescript
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  // Validate locale
  if (locale !== 'en' && locale !== 'ar') {
    notFound();
  }

  // Load messages
  const messages = await getMessages({ locale });
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div lang={locale} dir={direction}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <Providers>
          <BetaIndicator />
          {children}
          <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} />
        </Providers>
      </NextIntlClientProvider>
    </div>
  )
}
```

**Responsibilities:**

- Locale validation (404 for invalid locales)
- Message loading for current locale
- RTL/LTR direction setting
- NextIntlClientProvider wrapper
- Locale-aware UI positioning (Toaster)

---

## 📝 Translation Files Structure

### English (`messages/en.json`)

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    ...
  },
  "auth": {
    "login": {
      "title": "Welcome Back",
      "subtitle": "Sign in to your account to continue",
      "email": "Email address",
      ...
    },
    "signup": {...},
    "forgotPassword": {...},
    "resetPassword": {...}
  },
  "landing": {
    "nav": {
      "features": "Features",
      "howItWorks": "How It Works",
      "pricing": "Pricing",
      ...
    },
    "hero": {
      "title": {
        "prefix": "Manage Your",
        "highlight": "Google Business",
        "suffix": "with AI-Powered Intelligence"
      },
      ...
    },
    "features": {...},
    "pricing": {...},
    "testimonials": {...},
    "faq": {...}
  },
  "home": {
    "welcome": "Welcome back",
    "hero": {...},
    "stats": {...},
    "features": {...},
    "aiAssistant": {...},
    "whyChoose": {...},
    "quickActions": {...},
    "footer": {...}
  }
}
```

### Arabic (`messages/ar.json`)

```json
{
  "common": {
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجح",
    ...
  },
  "auth": {
    "login": {
      "title": "مرحباً بعودتك",
      "subtitle": "سجل الدخول إلى حسابك للمتابعة",
      "email": "عنوان البريد الإلكتروني",
      ...
    },
    ...
  },
  ...
}
```

**Structure Principles:**

- Nested namespaces for organization
- Identical structure in both files
- 523 lines each (perfect parity)
- Hierarchical key naming (e.g., `auth.login.title`)

---

## 🔧 Translation Usage Patterns

### Client Components (Interactive)

**Use:** `useTranslations` hook

```typescript
"use client";
import { useTranslations } from "next-intl";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <div>
      <h1>{t("hero.title.prefix")} <span>{t("hero.title.highlight")}</span></h1>
      <p>{t("hero.subtitle")}</p>
      <Button>{t("hero.cta")}</Button>
    </div>
  );
}
```

**Examples:**

- `/app/[locale]/landing.tsx` - Landing page
- `/app/[locale]/auth/login/page.tsx` - Login form
- `/app/[locale]/auth/signup/page.tsx` - Signup form
- `/components/landing/how-it-works.tsx` - Interactive sections
- `/components/landing/pricing.tsx` - Pricing cards
- `/components/landing/faq.tsx` - FAQ accordion

### Server Components (Static)

**Use:** `getTranslations` function

```typescript
import { getTranslations } from "next-intl/server";

export default async function HomePage({ params }) {
  const t = await getTranslations("home");

  return (
    <div>
      <h1>{t("welcome")}</h1>
      <p>{t("hero.subtitle")}</p>
    </div>
  );
}
```

**Examples:**

- `/app/[locale]/home/page.tsx` - Authenticated home page

### Namespace Scoping

```typescript
// Scoped to specific namespace
const t = useTranslations("landing.pricing");
t("free.name"); // → "Free"
t("pro.name"); // → "Pro"

// Multiple namespaces in one component
const tNav = useTranslations("landing.nav");
const tHero = useTranslations("landing.hero");
const tFeatures = useTranslations("landing.features");
```

---

## 🔄 Language Switching Component

### LanguageSwitcher Component

**File:** `/components/ui/LanguageSwitcher.tsx`

```typescript
"use client";
import { useLocale, usePathname } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Remove current locale from pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');

    // Construct new URL with new locale
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    const fullUrl = `${window.location.origin}${newPath}${window.location.search}`;

    // Full page reload to apply new locale
    window.location.href = fullUrl;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={locale === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => switchLocale('en')}
      >
        English
      </Button>
      <Button
        variant={locale === 'ar' ? 'default' : 'outline'}
        size="sm"
        onClick={() => switchLocale('ar')}
      >
        العربية
      </Button>
    </div>
  );
}
```

**Key Features:**

- Shows current locale with `default` variant
- Preserves current path when switching
- Maintains query parameters
- Full page reload for complete locale change
- Visual feedback (active state)

**Integration Points:**

1. **Landing Page Desktop Nav:** `/app/[locale]/landing.tsx`
2. **Landing Page Mobile Menu:** `/components/landing/mobile-menu.tsx`
3. **Authenticated Home Header:** `/app/[locale]/home/page.tsx`

---

## 🎨 RTL Support

### Direction Handling

```typescript
// In locale layout
const direction = locale === 'ar' ? 'rtl' : 'ltr';

<div lang={locale} dir={direction}>
  {children}
</div>
```

### UI Adjustments

```typescript
// Toaster position
<Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} />

// Tailwind RTL classes (if needed)
<div className="ltr:ml-4 rtl:mr-4">
```

---

## 🔍 Locale Detection Flow

```
1. User visits site
   ↓
2. Middleware intercepts request
   ↓
3. next-intl checks for locale in URL
   ↓
4. If no locale → redirect to /en/...
   ↓
5. If locale exists → validate against allowed locales
   ↓
6. Load appropriate messages file
   ↓
7. Set lang and dir attributes
   ↓
8. Render page with translations
```

---

## 📊 Translation Coverage

### Current Coverage

- **Total Lines:** 523 per language
- **Languages:** 2 (English, Arabic)
- **Namespaces:**
  - `common` - Shared UI strings
  - `auth` - Authentication flows (login, signup, forgot password, reset)
  - `landing` - Public landing page
  - `home` - Authenticated home page
  - Additional namespaces for dashboard features

### Key Sections Translated

✅ Landing Page (all sections)
✅ Authentication Pages (login, signup, password reset)
✅ Home Page (authenticated users)
✅ Navigation & Menus
✅ Forms & Validation
✅ Error Messages
✅ Success Messages

---

## 🛠️ Best Practices

### 1. Component Translation Pattern

```typescript
// ✅ Good: Scoped namespace
const t = useTranslations("landing.pricing");
return <h2>{t("title")}</h2>;

// ❌ Avoid: Full path every time
const t = useTranslations();
return <h2>{t("landing.pricing.title")}</h2>;
```

### 2. Server vs Client Components

```typescript
// ✅ Server Component
import { getTranslations } from "next-intl/server";
export default async function Page() {
  const t = await getTranslations("home");
  ...
}

// ✅ Client Component
"use client";
import { useTranslations } from "next-intl";
export default function Component() {
  const t = useTranslations("landing");
  ...
}
```

### 3. Structured Translation Keys

```json
{
  "section": {
    "title": {
      "prefix": "First part",
      "highlight": "Highlighted part",
      "suffix": "Last part"
    },
    "items": {
      "item1": {
        "title": "...",
        "description": "..."
      }
    }
  }
}
```

### 4. Locale-Aware Redirects

```typescript
// ✅ Preserve locale in redirects
redirect(`/${locale}/auth/login`);

// ❌ Hardcoded locale
redirect("/en/auth/login");
```

### 5. Type-Safe Locales

```typescript
// ✅ Use defined types
import { Locale } from "@/i18n";
const locale: Locale = "en";

// ❌ String literals
const locale = "en";
```

---

## 🚀 Adding New Translations

### Step 1: Add to Translation Files

```json
// messages/en.json
{
  "newSection": {
    "title": "New Section",
    "description": "Description here"
  }
}

// messages/ar.json
{
  "newSection": {
    "title": "قسم جديد",
    "description": "الوصف هنا"
  }
}
```

### Step 2: Use in Component

```typescript
const t = useTranslations("newSection");
return (
  <div>
    <h2>{t("title")}</h2>
    <p>{t("description")}</p>
  </div>
);
```

### Step 3: Test Both Locales

- Switch to English → verify text
- Switch to Arabic → verify text + RTL layout

---

## 🔐 Protected Routes with i18n

```typescript
// middleware.ts
const protectedPaths = [
  '/dashboard',
  '/reviews',
  '/home',
  ...
];

const isProtectedRoute = protectedPaths.some(path =>
  pathname.includes(path)
);

if (isProtectedRoute && !user) {
  // Preserve locale in redirect
  const loginUrl = new URL(`/${locale}/auth/login`, request.url);
  loginUrl.searchParams.set('redirectedFrom', pathname);
  return NextResponse.redirect(loginUrl);
}
```

**Features:**

- Locale-aware authentication redirects
- Preserves intended destination
- Maintains locale throughout auth flow

---

## 📱 Responsive i18n

### Mobile Menu Example

```typescript
export function MobileMenu({ isOpen, onClose }) {
  const t = useTranslations("landing");

  return (
    <motion.div>
      <nav>
        {[
          { label: t("nav.features"), href: "#features" },
          { label: t("nav.howItWorks"), href: "#how-it-works" },
          { label: t("nav.pricing"), href: "#pricing" },
        ].map(item => (
          <a href={item.href}>{item.label}</a>
        ))}
      </nav>
      <LanguageSwitcher />
    </motion.div>
  );
}
```

---

## 🎯 SEO & Metadata

### Current Implementation

```typescript
// app/layout.tsx (root)
export const metadata: Metadata = {
  title: "NNH AI Studio - Google My Business & YouTube Management Platform",
  description: "Manage your Google My Business locations...",
  ...
};
```

### Future Enhancement: Localized Metadata

```typescript
// app/[locale]/layout.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("og.title"),
      description: t("og.description"),
    },
  };
}
```

---

## 🧪 Testing i18n

### Manual Testing Checklist

- [ ] Switch between EN/AR on landing page
- [ ] Verify RTL layout for Arabic
- [ ] Check navigation preserves locale
- [ ] Test authentication flow in both languages
- [ ] Verify protected routes redirect with locale
- [ ] Check form validation messages
- [ ] Test error messages in both languages
- [ ] Verify Toaster position (left for AR, right for EN)

### URL Testing

```
✅ /en/auth/login
✅ /ar/auth/login
✅ /en/home
✅ /ar/home
✅ /en/dashboard
✅ /ar/dashboard
❌ /invalid/home → 404
```

---

## 📈 Performance Considerations

### Message Loading

- **Dynamic Import:** Messages loaded per locale (not all at once)
- **Tree Shaking:** Only used translations included in bundle
- **Caching:** Messages cached after first load

### Bundle Size

- English messages: ~15KB
- Arabic messages: ~15KB
- Only active locale loaded

---

## 🔮 Future Enhancements

### Potential Additions

1. **More Languages:** French, Spanish, German
2. **Localized Metadata:** SEO for each language
3. **Date/Time Formatting:** Using `next-intl` formatters
4. **Number Formatting:** Currency, percentages
5. **Pluralization:** Smart plural handling
6. **Dynamic Content Translation:** User-generated content
7. **Translation Management:** Integration with translation services

---

## 📚 Key Files Reference

| File                                  | Purpose                 |
| ------------------------------------- | ----------------------- |
| `/i18n.ts`                            | Core i18n configuration |
| `/middleware.ts`                      | Locale routing & auth   |
| `/next.config.mjs`                    | Next.js integration     |
| `/app/[locale]/layout.tsx`            | Locale provider setup   |
| `/messages/en.json`                   | English translations    |
| `/messages/ar.json`                   | Arabic translations     |
| `/components/ui/LanguageSwitcher.tsx` | Language toggle UI      |
| `/lib/navigation.ts`                  | Navigation helpers      |

---

## 🎓 Learning Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [RTL Best Practices](https://rtlstyling.com/)

---

**Last Updated:** November 20, 2024
**Maintained By:** NNH AI Studio Team
