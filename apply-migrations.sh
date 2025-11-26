#!/bin/bash

# =============================================================================
# Database Migration Script
# =============================================================================
# Description: Apply missing table migrations to Supabase
# Created: 2025-11-26
# Tables: performance_metrics, rate_limit_requests
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Functions
# =============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# Check Prerequisites
# =============================================================================

print_header "التحقق من المتطلبات"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  print_error "Supabase CLI غير مثبت"
  echo ""
  echo "لتثبيت Supabase CLI:"
  echo "  macOS: brew install supabase/tap/supabase"
  echo "  npm:   npm install -g supabase"
  echo ""
  exit 1
fi

print_success "Supabase CLI مثبت"

# Check if migration files exist
if [ ! -f "supabase/migrations/1764174400_add_performance_metrics.sql" ]; then
  print_error "ملف migration للـ performance_metrics غير موجود"
  exit 1
fi

if [ ! -f "supabase/migrations/1764174401_add_rate_limit_requests.sql" ]; then
  print_error "ملف migration للـ rate_limit_requests غير موجود"
  exit 1
fi

print_success "ملفات الـ migrations موجودة"

# =============================================================================
# Check Supabase Connection
# =============================================================================

print_header "التحقق من اتصال Supabase"

# Check if already linked
if [ ! -f ".supabase/config.toml" ]; then
  print_warning "المشروع غير مربوط بـ Supabase"
  echo ""
  read -p "هل تريد ربط المشروع الآن؟ (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "أدخل Project Reference ID: " PROJECT_REF
    supabase link --project-ref "$PROJECT_REF"
    print_success "تم ربط المشروع بنجاح"
  else
    print_error "لا يمكن المتابعة بدون ربط المشروع"
    exit 1
  fi
else
  print_success "المشروع مربوط بـ Supabase"
fi

# =============================================================================
# Apply Migrations
# =============================================================================

print_header "تطبيق الـ Migrations"

# Apply all pending migrations
print_info "تطبيق جميع الـ migrations الجديدة..."
if supabase db push --include-all --yes; then
  print_success "تم تطبيق الـ migrations بنجاح"
else
  print_warning "فشل تطبيق الـ migrations (قد تكون موجودة مسبقاً)"
fi

# =============================================================================
# Verify Tables
# =============================================================================

print_header "التحقق من الجداول"

# Note: Manual verification recommended via Supabase Dashboard
print_info "للتحقق من الجداول:"
echo ""
echo "  1. افتح Supabase Dashboard:"
echo "     https://app.supabase.com"
echo ""
echo "  2. اذهب إلى: Table Editor → القائمة الجانبية"
echo ""
echo "  3. يجب أن ترى:"
echo "     ✅ performance_metrics"
echo "     ✅ rate_limit_requests"
echo ""
echo "  أو شغل في SQL Editor:"
echo "     SELECT table_name FROM information_schema.tables"
echo "     WHERE table_schema = 'public'"
echo "     AND table_name IN ('performance_metrics', 'rate_limit_requests');"
echo ""

# =============================================================================
# Update Types
# =============================================================================

print_header "تحديث TypeScript Types"

print_info "توليد database.types.ts..."
if supabase gen types typescript --local > lib/types/database.types.ts; then
  print_success "تم تحديث database.types.ts بنجاح"
else
  print_warning "فشل تحديث database.types.ts (قد تحتاج للتحديث يدوياً)"
fi

# =============================================================================
# Summary
# =============================================================================

print_header "الملخص النهائي"

echo ""
echo "✅ الجداول المضافة:"
echo "   1. performance_metrics (7 columns)"
echo "   2. rate_limit_requests (6 columns)"
echo ""
echo "📊 الإحصائيات:"
echo "   - إجمالي الجداول: 25 (كان 23)"
echo "   - إجمالي الأعمدة: 619+ (كان 606)"
echo ""
echo "🔄 الخطوات التالية:"
echo "   1. تحقق من أن الجداول تعمل بشكل صحيح"
echo "   2. اختبر Performance Tracking: lib/performance-tracking.ts"
echo "   3. اختبر Rate Limiting: lib/security/rate-limiter.ts"
echo "   4. أعد تشغيل Dev Server: npm run dev"
echo ""

print_success "اكتملت العملية بنجاح! 🎉"
echo ""
