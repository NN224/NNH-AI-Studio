# 🟠 HIGH PRIORITY: Implement i18n for Hardcoded Text (12 Files)

## 📋 Problem Summary

**Issue ID:** HIGH-008
**Severity:** 🟠 HIGH - UX / Internationalization
**Priority:** P1
**Estimated Time:** 12 hours

---

## 🎯 Problem

**12+ files** have hardcoded Arabic/English text without using `useTranslations` from next-intl.

**Impact:** Users see wrong language (English users see Arabic, Arabic users see English)

---

## 📁 Files to Fix

### Critical Files (Arabic hardcoded):
1. `components/reviews/ReviewAISettings.tsx` (Lines 62-81)
2. `components/questions/QuestionAISettings.tsx` (Lines 53-72)
3. `components/settings/ai-settings-form.tsx` (Multiple lines)
4. `components/error-boundary/global-error-boundary.tsx` (Lines 109-161)

### Medium Files (English hardcoded):
5. `components/media/MediaUploader.tsx` (Lines 79-84)
6. `components/sidebar.tsx` (Lines 51-85)
7. `components/dashboard/lazy-dashboard-components.tsx` (Lines 60, 71)

---

## 🐛 Current Problem Example

### ReviewAISettings.tsx (Lines 62-65)

```typescript
<SheetTitle className="flex items-center gap-2">
  <Bot className="w-5 h-5" />
  إعدادات AI للمراجعات  {/* ❌ Hardcoded Arabic */}
</SheetTitle>
<SheetDescription>
  تخصيص كيفية رد النظام تلقائياً على مراجعات العملاء  {/* ❌ Hardcoded */}
</SheetDescription>
```

---

## ✅ Required Fix

### Step 1: Add Translations to messages/

#### messages/en.json
```json
{
  "Reviews": {
    "AISettings": {
      "title": "AI Settings for Reviews",
      "description": "Customize how the system automatically replies to customer reviews",
      "tone": "Response Tone",
      "tones": {
        "professional": "Professional",
        "friendly": "Friendly",
        "apologetic": "Apologetic",
        "marketing": "Marketing"
      }
    }
  }
}
```

#### messages/ar.json
```json
{
  "Reviews": {
    "AISettings": {
      "title": "إعدادات AI للمراجعات",
      "description": "تخصيص كيفية رد النظام تلقائياً على مراجعات العملاء",
      "tone": "نبرة الرد",
      "tones": {
        "professional": "احترافي",
        "friendly": "ودي",
        "apologetic": "اعتذاري",
        "marketing": "تسويقي"
      }
    }
  }
}
```

### Step 2: Update Component

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function ReviewAISettings() {
  const t = useTranslations('Reviews.AISettings');

  return (
    <Sheet>
      <SheetContent>
        <SheetTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          {t('title')} {/* ✅ Translated */}
        </SheetTitle>
        <SheetDescription>
          {t('description')} {/* ✅ Translated */}
        </SheetDescription>

        {/* ... rest of component */}
      </SheetContent>
    </Sheet>
  );
}
```

---

## 🔍 Complete File Fixes

### 1. ReviewAISettings.tsx

**Extract 8 strings to translations:**
- title, description, tone label
- 4 tone options (professional, friendly, apologetic, marketing)

### 2. QuestionAISettings.tsx

**Extract 7 strings:**
- title, description, auto-answer toggle
- 3 category labels

### 3. ai-settings-form.tsx

**Extract 15+ strings:**
- Provider labels, status messages
- Form field labels, help text

### 4. MediaUploader.tsx

**Extract 4 strings:**
```json
{
  "Media": {
    "Uploader": {
      "selectLocation": "Select a location to upload media",
      "dropActive": "Drop the images here",
      "dropInactive": "Drag and drop some files here, or click to select files",
      "uploading": "Uploading..."
    }
  }
}
```

---

## ✅ Acceptance Criteria

- [ ] All 12 files updated to use `useTranslations`
- [ ] All text extracted to messages/en.json
- [ ] All text translated to messages/ar.json
- [ ] No hardcoded strings in UI components
- [ ] Test with locale switcher (en ↔ ar)
- [ ] RTL layout works correctly
- [ ] No missing translation warnings
- [ ] TypeScript compiles

---

## 🧪 Testing

```bash
# 1. Test English
# Open http://localhost:5050/en/reviews
# Verify all text is in English

# 2. Test Arabic
# Open http://localhost:5050/ar/reviews
# Verify all text is in Arabic

# 3. Test switching
# Toggle locale switcher
# Verify immediate update
```

---

**Status:** 🟠 NOT STARTED
**Time:** 12 hours
