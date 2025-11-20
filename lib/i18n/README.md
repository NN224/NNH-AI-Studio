# i18n Utilities

Complete internationalization utilities for NNH AI Studio.

## 📚 Overview

This directory contains comprehensive i18n utilities including:

- **Formatting**: Date, time, number, and currency formatting
- **Pluralization**: Multi-language pluralization support
- **Navigation**: Locale-aware routing helpers

## 🚀 Quick Start

### Client Components

```typescript
'use client';

import { useI18nFormatter, usePluralization } from '@/lib/i18n';
import { useLocale } from 'next-intl';

export default function MyComponent() {
  const { formatDate, formatNumber, formatCurrency } = useI18nFormatter();
  const locale = useLocale();
  const { formatPlural } = usePluralization(locale);

  const date = new Date();
  const count = 5;

  return (
    <div>
      {/* Format date */}
      <p>{formatDate(date)}</p>

      {/* Format number */}
      <p>{formatNumber(1234.56)}</p>

      {/* Format currency */}
      <p>{formatCurrency(99.99, 'USD')}</p>

      {/* Pluralization */}
      <p>{formatPlural(count, {
        one: '1 item',
        other: '{count} items'
      })}</p>
    </div>
  );
}
```

### Server Components

```typescript
import { formatDateServer, formatNumberServer } from '@/lib/i18n';

export default async function MyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const date = new Date();

  return (
    <div>
      <p>{formatDateServer(date, locale)}</p>
      <p>{formatNumberServer(1234.56, locale)}</p>
    </div>
  );
}
```

## 📖 API Reference

### Formatting

#### `useI18nFormatter()` (Client-side hook)

Returns formatting functions:

- **`formatDate(date, options?)`** - Format dates
- **`formatTime(date, options?)`** - Format times
- **`formatDateTime(date, options?)`** - Format date and time
- **`formatRelativeTime(date)`** - Format relative time (e.g., "2 hours ago")
- **`formatNumber(value, options?)`** - Format numbers
- **`formatCurrency(value, currency, options?)`** - Format currency
- **`formatPercent(value, options?)`** - Format percentages
- **`formatCompactNumber(value)`** - Format compact numbers (1K, 1M)

#### Server-side Functions

- **`formatDateServer(date, locale, options?)`**
- **`formatTimeServer(date, locale, options?)`**
- **`formatNumberServer(value, locale, options?)`**
- **`formatCurrencyServer(value, locale, currency, options?)`**

### Pluralization

#### `usePluralization(locale)` (Client-side hook)

Returns pluralization functions:

- **`formatPlural(count, rules, replacements?)`** - Format with plural rules
- **`getPluralForm(count)`** - Get plural form for count

#### Example with Translation Keys

```typescript
// In messages/en.json
{
  "common": {
    "plurals": {
      "items": {
        "one": "{count} item",
        "other": "{count} items"
      }
    }
  }
}

// In messages/ar.json
{
  "common": {
    "plurals": {
      "items": {
        "zero": "لا توجد عناصر",
        "one": "عنصر واحد",
        "two": "عنصران",
        "few": "{count} عناصر",
        "many": "{count} عنصراً",
        "other": "{count} عنصر"
      }
    }
  }
}

// Usage
const { formatPlural } = usePluralization(locale);
const t = useTranslations('common.plurals.items');

formatPlural(5, {
  zero: t('zero'),
  one: t('one'),
  two: t('two'),
  few: t('few'),
  many: t('many'),
  other: t('other')
});
```

### Navigation

Locale-aware navigation helpers from `next-intl`:

- **`Link`** - Locale-aware Link component
- **`redirect(path)`** - Locale-aware redirect
- **`usePathname()`** - Get current pathname
- **`useRouter()`** - Get locale-aware router

```typescript
import { Link, redirect, usePathname } from '@/lib/i18n';

// Link automatically includes locale
<Link href="/dashboard">Dashboard</Link>

// Redirect preserves locale
redirect('/auth/login');

// Get pathname without locale prefix
const pathname = usePathname(); // "/dashboard" instead of "/en/dashboard"
```

## 🌍 Supported Locales

- **English (en)** - 2 plural forms (one, other)
- **Arabic (ar)** - 6 plural forms (zero, one, two, few, many, other)

## 🎨 Formatting Examples

### Dates

```typescript
const { formatDate, formatTime, formatDateTime, formatRelativeTime } =
  useI18nFormatter();

formatDate(new Date());
// EN: "November 20, 2024"
// AR: "٢٠ نوفمبر ٢٠٢٤"

formatTime(new Date());
// EN: "03:30 PM"
// AR: "٠٣:٣٠ م"

formatRelativeTime(new Date(Date.now() - 3600000));
// EN: "1 hour ago"
// AR: "قبل ساعة واحدة"
```

### Numbers & Currency

```typescript
const { formatNumber, formatCurrency, formatPercent, formatCompactNumber } =
  useI18nFormatter();

formatNumber(1234.56);
// EN: "1,234.56"
// AR: "١٬٢٣٤٫٥٦"

formatCurrency(99.99, "USD");
// EN: "$99.99"
// AR: "٩٩٫٩٩ US$"

formatPercent(75);
// EN: "75%"
// AR: "٧٥٪"

formatCompactNumber(1500);
// EN: "1.5K"
// AR: "١٫٥ ألف"
```

### Pluralization

```typescript
const { formatPlural } = usePluralization(locale);

// English
formatPlural(0, { one: "1 review", other: "{count} reviews" });
// "0 reviews"

formatPlural(1, { one: "1 review", other: "{count} reviews" });
// "1 review"

formatPlural(5, { one: "1 review", other: "{count} reviews" });
// "5 reviews"

// Arabic
formatPlural(0, {
  zero: "لا توجد مراجعات",
  one: "مراجعة واحدة",
  two: "مراجعتان",
  few: "{count} مراجعات",
  many: "{count} مراجعة",
  other: "{count} مراجعة",
});
// "لا توجد مراجعات"

formatPlural(5, {
  /* same rules */
});
// "5 مراجعات"

formatPlural(15, {
  /* same rules */
});
// "15 مراجعة"
```

## 🔧 Best Practices

1. **Always use formatting utilities** instead of manual formatting
2. **Use server-side functions** in server components for better performance
3. **Include all plural forms** for each locale
4. **Test with various numbers** to ensure correct plural forms
5. **Use locale-aware navigation** to preserve user's language preference
6. **Format currency** with the appropriate currency code for the locale

## 📝 Adding New Plural Forms

To add new plural forms to translation files:

```json
// messages/en.json
{
  "common": {
    "plurals": {
      "newItem": {
        "one": "{count} new item",
        "other": "{count} new items"
      }
    }
  }
}

// messages/ar.json
{
  "common": {
    "plurals": {
      "newItem": {
        "zero": "لا توجد عناصر جديدة",
        "one": "عنصر جديد واحد",
        "two": "عنصران جديدان",
        "few": "{count} عناصر جديدة",
        "many": "{count} عنصراً جديداً",
        "other": "{count} عنصر جديد"
      }
    }
  }
}
```

## 🌐 Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Unicode CLDR Plural Rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)

---

**Last Updated:** November 20, 2024
**Maintained By:** NNH AI Studio Team
