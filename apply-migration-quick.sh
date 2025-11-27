#!/bin/bash

# 🚀 Quick Migration Apply Script
# تطبيق سريع للـ Migration

echo "================================================"
echo "🔄 تطبيق Database Migration"
echo "   Applying Database Migration"
echo "================================================"
echo ""

MIGRATION_FILE="supabase/migrations/20251127000000_add_missing_tables.sql"

# التحقق من وجود الملف
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found!"
    echo "   Looking for: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Found migration file: $MIGRATION_FILE"
echo "   Lines: $(wc -l < $MIGRATION_FILE)"
echo ""

# خيارات التطبيق
echo "اختر طريقة التطبيق / Choose application method:"
echo ""
echo "1) Supabase CLI (إذا كان مثبت / if installed)"
echo "2) نسخ SQL للـ Dashboard (Copy SQL for Dashboard)"
echo "3) عرض المحتوى (Show content)"
echo "4) الخروج (Exit)"
echo ""
read -p "اختيارك / Your choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🔄 Checking for Supabase CLI..."
        if ! command -v supabase &> /dev/null; then
            echo "❌ Supabase CLI not installed!"
            echo ""
            echo "To install:"
            echo "  macOS:  brew install supabase/tap/supabase"
            echo "  Linux:  See APPLY_MIGRATION_INSTRUCTIONS.md"
            echo ""
            exit 1
        fi

        echo "✅ Supabase CLI found!"
        echo ""
        echo "🔄 Applying migration..."
        supabase db push

        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Migration applied successfully!"
            echo ""
            echo "🔍 Verifying tables..."
            supabase db diff
        else
            echo ""
            echo "❌ Migration failed! Check errors above."
            exit 1
        fi
        ;;

    2)
        echo ""
        echo "📋 Copying SQL to clipboard..."

        # Try different clipboard commands
        if command -v pbcopy &> /dev/null; then
            cat "$MIGRATION_FILE" | pbcopy
            echo "✅ SQL copied to clipboard (macOS)!"
        elif command -v xclip &> /dev/null; then
            cat "$MIGRATION_FILE" | xclip -selection clipboard
            echo "✅ SQL copied to clipboard (Linux)!"
        elif command -v clip &> /dev/null; then
            cat "$MIGRATION_FILE" | clip
            echo "✅ SQL copied to clipboard (Windows)!"
        else
            echo "⚠️  Clipboard tool not found."
            echo ""
            echo "📄 SQL content printed below - copy manually:"
            echo "================================================"
            cat "$MIGRATION_FILE"
            echo "================================================"
        fi

        echo ""
        echo "📝 Next steps:"
        echo "1. Go to: https://app.supabase.com"
        echo "2. Select your project"
        echo "3. Go to: SQL Editor"
        echo "4. Paste the SQL and click 'Run'"
        echo "5. Verify success (should show: 'Success. No rows returned')"
        ;;

    3)
        echo ""
        echo "📄 Migration content:"
        echo "================================================"
        cat "$MIGRATION_FILE"
        echo "================================================"
        echo ""
        echo "Total lines: $(wc -l < $MIGRATION_FILE)"
        ;;

    4)
        echo "👋 Goodbye!"
        exit 0
        ;;

    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "✅ Done!"
echo "================================================"
echo ""
echo "📚 For detailed instructions, see:"
echo "   APPLY_MIGRATION_INSTRUCTIONS.md"
echo ""
