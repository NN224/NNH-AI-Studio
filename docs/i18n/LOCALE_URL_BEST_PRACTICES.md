# Locale URL Best Practices

## ⚠️ Common Issue: Duplicate Locale in URLs

### The Problem

When building locale-aware navigation, a common issue is ending up with duplicate locales in URLs:

```
❌ WRONG: /ar/en/home
❌ WRONG: /en/ar/dashboard
✅ CORRECT: /ar/home
✅ CORRECT: /en/dashboard
```

### Root Cause

This happens when:

1. `usePathname()` from Next.js returns the full pathname **including** the locale (`/ar/home`)
2. Code assumes the pathname is **without** the locale (`/home`)
3. When switching locale, it adds the new locale prefix, resulting in `/en/ar/home`

---

## ✅ Solution: Use Utility Functions

We've created utility functions to handle locale prefixes correctly:

### 1. `removeLocaleFromPathname(pathname)`

Removes locale prefix from pathname:

```typescript
import { removeLocaleFromPathname } from "@/lib/i18n/utils";

const pathname = "/ar/home";
const withoutLocale = removeLocaleFromPathname(pathname);
// Result: '/home'
```

### 2. `addLocaleToPathname(pathname, locale)`

Adds locale prefix to pathname:

```typescript
import { addLocaleToPathname } from "@/lib/i18n/utils";

const pathname = "/home";
const withLocale = addLocaleToPathname(pathname, "ar");
// Result: '/ar/home'
```

### 3. `switchLocaleInPathname(pathname, newLocale)`

Switches locale in pathname (removes old, adds new):

```typescript
import { switchLocaleInPathname } from "@/lib/i18n/utils";

const pathname = "/ar/home";
const switched = switchLocaleInPathname(pathname, "en");
// Result: '/en/home'
```

---

## 📝 Usage Examples

### Language Switcher

**✅ CORRECT:**

```typescript
import { switchLocaleInPathname } from '@/lib/i18n/utils';
import { usePathname } from '@/lib/navigation';
import { useLocale } from 'next-intl';

function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Use utility function to handle locale switching
    const newPath = switchLocaleInPathname(pathname, newLocale);
    window.location.href = window.location.origin + newPath;
  };

  return (
    <>
      <button onClick={() => switchLocale('en')}>English</button>
      <button onClick={() => switchLocale('ar')}>العربية</button>
    </>
  );
}
```

**❌ WRONG:**

```typescript
// DON'T DO THIS!
function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname(); // This includes locale!

  const switchLocale = (newLocale: string) => {
    // This will create /en/ar/home instead of /en/home
    const newPath = `/${newLocale}${pathname}`;
    window.location.href = window.location.origin + newPath;
  };
  // ...
}
```

### Creating Locale-Aware Links

**✅ CORRECT:**

```typescript
import { addLocaleToPathname } from '@/lib/i18n/utils';
import { useLocale } from 'next-intl';
import Link from 'next/link';

function MyComponent() {
  const locale = useLocale();

  return (
    <Link href={addLocaleToPathname('/dashboard', locale)}>
      Dashboard
    </Link>
  );
}
```

Or use the locale directly:

```typescript
import { useLocale } from 'next-intl';
import Link from 'next/link';

function MyComponent() {
  const locale = useLocale();

  return (
    <Link href={`/${locale}/dashboard`}>
      Dashboard
    </Link>
  );
}
```

---

## 🔍 Checking for Issues

### Manual Testing

Test locale switching on all pages:

```bash
# Test English to Arabic
1. Visit: /en/home
2. Click Arabic button
3. Verify URL is: /ar/home (NOT /ar/en/home)

# Test Arabic to English
1. Visit: /ar/dashboard
2. Click English button
3. Verify URL is: /en/dashboard (NOT /en/ar/dashboard)
```

### Console Logging

Enable debug logging in development:

```typescript
if (process.env.NODE_ENV === "development") {
  console.log("Current pathname:", pathname);
  console.log("Without locale:", removeLocaleFromPathname(pathname));
  console.log("With new locale:", switchLocaleInPathname(pathname, "en"));
}
```

---

## 🛠️ Utility Functions API

### `removeLocaleFromPathname(pathname: string): string`

**Description:** Removes locale prefix from pathname

**Parameters:**

- `pathname`: The pathname with locale (e.g., `/ar/home`)

**Returns:** The pathname without locale (e.g., `/home`)

**Example:**

```typescript
removeLocaleFromPathname("/ar/home"); // → '/home'
removeLocaleFromPathname("/en/dashboard"); // → '/dashboard'
removeLocaleFromPathname("/ar"); // → '/'
removeLocaleFromPathname("/home"); // → '/home' (no locale)
```

---

### `addLocaleToPathname(pathname: string, locale: string): string`

**Description:** Adds locale prefix to pathname

**Parameters:**

- `pathname`: The pathname without locale (e.g., `/home`)
- `locale`: The locale to add (e.g., `'ar'`)

**Returns:** The pathname with locale (e.g., `/ar/home`)

**Example:**

```typescript
addLocaleToPathname("/home", "ar"); // → '/ar/home'
addLocaleToPathname("/dashboard", "en"); // → '/en/dashboard'
addLocaleToPathname("/", "ar"); // → '/ar'
```

---

### `switchLocaleInPathname(pathname: string, newLocale: string): string`

**Description:** Switches locale in pathname (removes old locale, adds new)

**Parameters:**

- `pathname`: Current pathname (e.g., `/ar/home`)
- `newLocale`: New locale (e.g., `'en'`)

**Returns:** The pathname with new locale (e.g., `/en/home`)

**Example:**

```typescript
switchLocaleInPathname("/ar/home", "en"); // → '/en/home'
switchLocaleInPathname("/en/dashboard", "ar"); // → '/ar/dashboard'
switchLocaleInPathname("/home", "ar"); // → '/ar/home'
```

---

### `getLocaleFromPathname(pathname: string): string | null`

**Description:** Gets current locale from pathname

**Parameters:**

- `pathname`: The pathname to check

**Returns:** The locale (`'en'` or `'ar'`) or `null` if not found

**Example:**

```typescript
getLocaleFromPathname("/ar/home"); // → 'ar'
getLocaleFromPathname("/en/home"); // → 'en'
getLocaleFromPathname("/home"); // → null
```

---

### `hasLocalePrefix(pathname: string): boolean`

**Description:** Checks if pathname has locale prefix

**Parameters:**

- `pathname`: The pathname to check

**Returns:** `true` if pathname has locale prefix, `false` otherwise

**Example:**

```typescript
hasLocalePrefix("/ar/home"); // → true
hasLocalePrefix("/en/home"); // → true
hasLocalePrefix("/home"); // → false
```

---

## 🎯 Testing Checklist

Before deploying locale changes:

- [ ] Test switching from EN to AR on home page
- [ ] Test switching from AR to EN on home page
- [ ] Test switching on dashboard pages
- [ ] Test switching on settings pages
- [ ] Verify no duplicate locales in console logs
- [ ] Check URLs in browser address bar
- [ ] Test with query parameters (e.g., `?tab=settings`)
- [ ] Test with hash fragments (e.g., `#section`)
- [ ] Test direct URL access to different locales
- [ ] Test 404 pages with locale

---

## 🐛 Debugging Tips

### Issue: Still seeing duplicate locales

**Check:**

1. Are you using `usePathname()` from `@/lib/navigation`?
2. Are you using utility functions from `@/lib/i18n/utils`?
3. Check browser console for debug logs

**Fix:**

```typescript
// Add debug logging
console.log("Pathname from usePathname:", pathname);
console.log("Has locale prefix:", hasLocalePrefix(pathname));
console.log("Locale from pathname:", getLocaleFromPathname(pathname));
```

### Issue: Locale not switching

**Check:**

1. Is `window.location.href` being set correctly?
2. Check browser console for errors
3. Verify middleware is running

**Fix:**

```typescript
// Add try-catch and logging
try {
  const newPath = switchLocaleInPathname(pathname, newLocale);
  console.log("Switching to:", newPath);
  window.location.href = window.location.origin + newPath;
} catch (error) {
  console.error("Error switching locale:", error);
}
```

---

## 📚 Related Documentation

- **[I18N_ARCHITECTURE.md](./I18N_ARCHITECTURE.md)** - Complete i18n architecture
- **[I18N_QUICK_REFERENCE.md](./I18N_QUICK_REFERENCE.md)** - Quick reference guide
- **[lib/i18n/utils.ts](../../lib/i18n/utils.ts)** - Utility functions source code

---

**Last Updated:** November 20, 2024
**Status:** ✅ Fixed and Tested
