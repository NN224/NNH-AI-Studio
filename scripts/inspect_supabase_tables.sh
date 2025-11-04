#!/bin/bash

# ========================================
# Supabase Database Structure Inspector
# Run this to see all table columns
# ========================================

echo "🔍 Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: brew install supabase/tap/supabase"
    echo "📋 Alternative: Copy sql/inspect_all_tables.sql and run in Supabase SQL Editor"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""
echo "📊 Inspecting gmb_accounts table structure..."
echo "================================================"

# Check if logged in
if ! supabase db diff 2>/dev/null | grep -q "error"; then
    echo "✅ Connected to Supabase"
else
    echo "⚠️  Not logged in. Run: supabase login"
    echo "📋 Alternative: Use sql/inspect_all_tables.sql in Supabase Dashboard"
    exit 1
fi

# Get table structure
echo ""
echo "🔍 GMB_ACCOUNTS Table Columns:"
echo "--------------------------------"
supabase db dump --db-url "$SUPABASE_DB_URL" --schema public --table gmb_accounts --data-only=false 2>/dev/null | grep -A 50 "CREATE TABLE" | head -30

echo ""
echo "📝 To see full database structure, run:"
echo "   supabase db dump --schema public > database_schema.sql"
echo ""
echo "Or use: sql/inspect_all_tables.sql in Supabase SQL Editor"
