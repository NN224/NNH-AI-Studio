# i18n Quick Reference Guide

## 🚀 Quick Start

### For Client Components

```typescript
"use client";
import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations("myNamespace");
  return <h1>{t("title")}</h1>;
}
```

### For Server Components

```typescript
import { getTranslations } from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("myNamespace");
  return <h1>{t("title")}</h1>;
}
```

---

## 📝 Common Patterns

### 1. Basic Translation

```typescript
const t = useTranslations("landing");
<h1>{t("title")}</h1>
```

### 2. Nested Keys

```typescript
const t = useTranslations("landing.hero");
<h1>{t("title.prefix")} <span>{t("title.highlight")}</span></h1>
```

### 3. Scoped Namespace

```typescript
// Instead of this:
const t = useTranslations();
<h1>{t("landing.pricing.title")}</h1>

// Do this:
const t = useTranslations("landing.pricing");
<h1>{t("title")}</h1>
```

### 4. Multiple Namespaces

```typescript
const tNav = useTranslations("landing.nav");
const tHero = useTranslations("landing.hero");
const tFeatures = useTranslations("landing.features");

return (
  <>
    <nav>{tNav("features")}</nav>
    <h1>{tHero("title")}</h1>
    <p>{tFeatures("subtitle")}</p>
  </>
);
```

### 5. Dynamic Content

```typescript
const items = [
  { title: t("items.item1.title"), desc: t("items.item1.description") },
  { title: t("items.item2.title"), desc: t("items.item2.description") },
  { title: t("items.item3.title"), desc: t("items.item3.description") },
];
```

---

## 🔧 Hooks & Functions

### Client-Side Hooks

```typescript
import { useTranslations, useLocale } from "next-intl";

const t = useTranslations("namespace");
const locale = useLocale(); // "en" or "ar"
```

### Server-Side Functions

```typescript
import { getTranslations, getLocale } from "next-intl/server";

const t = await getTranslations("namespace");
const locale = await getLocale(); // "en" or "ar"
```

### Navigation Hooks

```typescript
import { usePathname } from "next-intl";

const pathname = usePathname(); // "/en/home" or "/ar/home"
```

---

## 🌍 Language Switcher

### Basic Implementation

```typescript
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

<LanguageSwitcher />
```

### Custom Implementation

```typescript
import { useLocale, usePathname } from "next-intl";

const locale = useLocale();
const pathname = usePathname();

const switchLocale = (newLocale: string) => {
  const pathWithoutLocale = pathname.replace(`/${locale}`, '');
  const newPath = `/${newLocale}${pathWithoutLocale}`;
  window.location.href = `${window.location.origin}${newPath}`;
};

<button onClick={() => switchLocale('ar')}>العربية</button>
<button onClick={() => switchLocale('en')}>English</button>
```

---

## 📂 Adding New Translations

### Step 1: Add to en.json

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature",
    "actions": {
      "submit": "Submit",
      "cancel": "Cancel"
    }
  }
}
```

### Step 2: Add to ar.json

```json
{
  "myFeature": {
    "title": "ميزتي",
    "description": "هذه هي ميزتي",
    "actions": {
      "submit": "إرسال",
      "cancel": "إلغاء"
    }
  }
}
```

### Step 3: Use in Component

```typescript
const t = useTranslations("myFeature");

<div>
  <h2>{t("title")}</h2>
  <p>{t("description")}</p>
  <button>{t("actions.submit")}</button>
  <button>{t("actions.cancel")}</button>
</div>
```

---

## 🔗 Locale-Aware Links

### Using Next.js Link

```typescript
import { Link } from "@/lib/navigation";

<Link href="/dashboard">Dashboard</Link>
// Automatically becomes /en/dashboard or /ar/dashboard
```

### Manual Locale Links

```typescript
import { useLocale } from "next-intl";

const locale = useLocale();

<a href={`/${locale}/dashboard`}>Dashboard</a>
```

---

## 🎨 RTL Support

### Direction Detection

```typescript
import { useLocale } from "next-intl";

const locale = useLocale();
const direction = locale === 'ar' ? 'rtl' : 'ltr';

<div dir={direction}>
  {children}
</div>
```

### Conditional Styling

```typescript
const locale = useLocale();

<Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} />
```

### Tailwind RTL Classes

```typescript
<div className="ltr:ml-4 rtl:mr-4">
  Content
</div>
```

---

## 🔐 Protected Routes

### Middleware Pattern

```typescript
// middleware.ts
const protectedPaths = ["/dashboard", "/reviews", "/home"];
const locale = pathname.split("/")[1] || "en";

if (isProtectedRoute && !user) {
  const loginUrl = new URL(`/${locale}/auth/login`, request.url);
  loginUrl.searchParams.set("redirectedFrom", pathname);
  return NextResponse.redirect(loginUrl);
}
```

### Page-Level Redirect

```typescript
import { redirect } from "next/navigation";

export default async function ProtectedPage({ params }) {
  const { locale } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return <div>Protected Content</div>;
}
```

---

## 📊 Translation File Structure

### Recommended Hierarchy

```json
{
  "common": {
    "loading": "...",
    "error": "...",
    "success": "..."
  },
  "auth": {
    "login": { ... },
    "signup": { ... }
  },
  "pages": {
    "home": { ... },
    "dashboard": { ... }
  },
  "components": {
    "header": { ... },
    "footer": { ... }
  }
}
```

### Complex Structures

```json
{
  "pricing": {
    "title": "Pricing Plans",
    "plans": {
      "free": {
        "name": "Free",
        "price": "$0",
        "features": ["Feature 1", "Feature 2", "Feature 3"]
      },
      "pro": {
        "name": "Pro",
        "price": "$29",
        "features": ["All Free features", "Feature 4", "Feature 5"]
      }
    }
  }
}
```

Usage:

```typescript
const t = useTranslations("pricing");

<h1>{t("title")}</h1>
<h2>{t("plans.free.name")}</h2>
<p>{t("plans.free.price")}</p>
{t("plans.free.features").map((feature, i) => (
  <li key={i}>{feature}</li>
))}
```

---

## 🐛 Common Issues & Solutions

### Issue: Translation not found

```typescript
// ❌ Wrong
const t = useTranslations();
<h1>{t("landing.title")}</h1>  // May not exist

// ✅ Correct
const t = useTranslations("landing");
<h1>{t("title")}</h1>
```

### Issue: Server/Client mismatch

```typescript
// ❌ Wrong - using client hook in server component
export default async function Page() {
  const t = useTranslations("home");  // Error!
  ...
}

// ✅ Correct
export default async function Page() {
  const t = await getTranslations("home");
  ...
}
```

### Issue: Locale not preserved in redirect

```typescript
// ❌ Wrong
redirect("/dashboard");

// ✅ Correct
const locale = await getLocale();
redirect(`/${locale}/dashboard`);
```

### Issue: Missing translation key

```typescript
// Add fallback
const title = t("title", { fallback: "Default Title" });

// Or check existence
const hasTitle = t.has("title");
if (hasTitle) {
  return <h1>{t("title")}</h1>;
}
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Switch to English → verify all text
- [ ] Switch to Arabic → verify all text + RTL
- [ ] Navigate between pages → locale persists
- [ ] Login/Logout → locale persists
- [ ] Refresh page → locale persists
- [ ] Direct URL access → correct locale loads
- [ ] Invalid locale URL → 404 or redirect

### URL Testing

```
✅ /en/home
✅ /ar/home
✅ /en/auth/login
✅ /ar/auth/login
✅ /en/dashboard
✅ /ar/dashboard
❌ /fr/home → 404
❌ /invalid/home → 404
```

---

## 📚 File Locations

| File                                  | Purpose              |
| ------------------------------------- | -------------------- |
| `/i18n.ts`                            | Core config          |
| `/middleware.ts`                      | Routing & auth       |
| `/next.config.mjs`                    | Next.js integration  |
| `/app/[locale]/layout.tsx`            | Locale provider      |
| `/messages/en.json`                   | English translations |
| `/messages/ar.json`                   | Arabic translations  |
| `/components/ui/LanguageSwitcher.tsx` | Language toggle      |

---

## 🎯 Best Practices

### ✅ Do

- Use scoped namespaces
- Keep translation keys consistent across languages
- Use server components when possible
- Preserve locale in all redirects
- Test both languages regularly
- Use TypeScript for type safety

### ❌ Don't

- Hardcode strings in components
- Mix server/client translation hooks
- Forget RTL considerations
- Hardcode locale in URLs
- Skip translation for new features
- Use different structures in en.json and ar.json

---

## 🔍 Debugging

### Check Current Locale

```typescript
import { useLocale } from "next-intl";

const locale = useLocale();
console.log("Current locale:", locale);
```

### Check Available Messages

```typescript
const t = useTranslations("landing");
console.log("Has title:", t.has("title"));
```

### Check Pathname

```typescript
import { usePathname } from "next-intl";

const pathname = usePathname();
console.log("Current path:", pathname);
```

### Inspect Loaded Messages

```typescript
// In locale layout
const messages = await getMessages({ locale });
console.log("Loaded messages:", Object.keys(messages));
```

---

## 🚀 Performance Tips

1. **Use Server Components:** Faster initial load
2. **Scope Namespaces:** Smaller bundle per component
3. **Lazy Load:** Only load needed translations
4. **Cache Messages:** Automatic with next-intl
5. **Tree Shaking:** Unused translations removed in build

---

## 📞 Need Help?

- **Documentation:** [next-intl docs](https://next-intl-docs.vercel.app/)
- **Examples:** Check `/app/[locale]/landing.tsx`
- **Architecture:** See `I18N_ARCHITECTURE.md`
- **Flow Diagrams:** See `I18N_FLOW_DIAGRAM.md`

---

**Last Updated:** November 20, 2024
