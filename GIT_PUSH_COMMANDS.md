# 🚀 أوامر Git للنشر على GitHub

## 📋 الخطوات:

### 1. التحقق من التغييرات
```bash
git status
```

### 2. إضافة جميع التغييرات
```bash
git add .
```

### 3. عمل Commit
```bash
git commit -m "Fix GMB OAuth: location_id format, reviews/media sync, and database migrations

- Fix oauth_states foreign key to use auth.users instead of profiles
- Create gmb_media table for storing GMB media items
- Fix location_id format to include accounts/ prefix
- Improve fetchReviews and fetchMedia to build location resource automatically
- Fix redirect_uri consistency between create-auth-url and oauth-callback
- Add better error handling for reviews and media API calls
- Add SQL scripts for database fixes and verification"
```

### 4. Push إلى GitHub
```bash
git push origin main
```

---

## 📝 أوامر سريعة (نسخ ولصق):

```bash
git add .
git commit -m "Fix GMB OAuth: location_id format, reviews/media sync, and database migrations"
git push origin main
```

---

## 🔄 إذا كان Branch مختلف:

إذا كنت على branch آخر (مثل `master` أو `develop`):

```bash
# للتحقق من Branch الحالي
git branch

# إذا كنت على master
git push origin master

# إذا كنت على develop
git push origin develop
```

---

## ⚠️ إذا واجهت مشاكل:

### إذا كان هناك تغييرات في Remote:
```bash
# Pull التغييرات أولاً
git pull origin main

# ثم Push مرة أخرى
git push origin main
```

### إذا كان هناك Conflicts:
```bash
# Resolve conflicts أولاً
# ثم:
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

---

## ✅ التحقق من النشر:

بعد Push، افتح GitHub وتحقق من:
- ✅ التغييرات موجودة في Repository
- ✅ Commit message صحيح
- ✅ جميع الملفات الجديدة موجودة

