# حل مشكلة اللغة العربية

## المشكلة:
الصفحة تفتح بالعربي رغم عدم وجود `/ar/` في الـ URL.

## السبب:
Cookie محفوظ اسمه `NEXT_LOCALE=ar`

---

## ✅ الحل:

### طريقة 1: مسح الـ Cookie
1. افتح **Developer Tools** (اضغط F12)
2. اذهب إلى **Console**
3. الصق هذا الكود واضغط Enter:

```javascript
document.cookie = "NEXT_LOCALE=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
window.location.href = "/en/settings/auto-pilot";
```

---

### طريقة 2: الذهاب مباشرة للرابط الإنجليزي

افتح في المتصفح:

```
http://localhost:5050/en/settings/auto-pilot
```

---

### طريقة 3: استخدام Incognito/Private Window

- **Chrome:** `Cmd + Shift + N`
- **Firefox:** `Cmd + Shift + P`
- **Safari:** `Cmd + Shift + N`

ثم اذهب إلى:
```
http://localhost:5050/settings/auto-pilot
```

سيتم توجيهك تلقائياً إلى `/en/`

---

## 🎯 النتيجة المتوقعة:

بعد مسح الـ Cookie، كل مرة تزور:

```
/settings/auto-pilot
```

سيتم التوجيه تلقائياً إلى:

```
/en/settings/auto-pilot  ← إنجليزي (default)
```

---

## 📝 للتبديل بين اللغات:

- **إنجليزي:** `/en/settings/auto-pilot`
- **عربي:** `/ar/settings/auto-pilot`

أو استخدم **Language Switcher** (زر Globe 🌐) في الواجهة.

