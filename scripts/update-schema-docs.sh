#!/bin/bash

# ============================================
# 🔄 تحديث توثيق Database Schema
# ============================================
# يساعدك تتذكر كل الخطوات بعد تعديل الـ schema
# ============================================

echo "============================================"
echo "🔄 Database Schema Documentation Updater"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1. Check if migration was added
# ============================================
echo -e "${BLUE}1️⃣ Checking for new migrations...${NC}"

# Get latest migration
LATEST_MIGRATION=$(ls -t supabase/migrations/*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_MIGRATION" ]; then
    echo -e "${YELLOW}⚠️  No migrations found in supabase/migrations/${NC}"
else
    echo -e "${GREEN}✅ Latest migration: $(basename $LATEST_MIGRATION)${NC}"
fi

echo ""

# ============================================
# 2. Remind to export schema
# ============================================
echo -e "${YELLOW}2️⃣ Export Schema from Supabase:${NC}"
echo ""
echo "   a. Open Supabase Dashboard → SQL Editor"
echo "   b. Run: scripts/export-complete-schema.sql"
echo "   c. Export results as CSV"
echo "   d. Save as: database-schema.csv"
echo ""
read -p "   Did you export the schema? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Please export schema first!${NC}"
    echo ""
    echo "   Script location: scripts/export-complete-schema.sql"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Schema exported${NC}"
echo ""

# ============================================
# 3. Check if database-schema.csv exists
# ============================================
echo -e "${BLUE}3️⃣ Checking database-schema.csv...${NC}"

if [ ! -f "database-schema.csv" ]; then
    echo -e "${RED}❌ database-schema.csv not found!${NC}"
    echo "   Please save the exported CSV as: database-schema.csv"
    exit 1
fi

echo -e "${GREEN}✅ database-schema.csv found${NC}"
FILE_SIZE=$(du -h database-schema.csv | cut -f1)
echo "   File size: $FILE_SIZE"
echo ""

# ============================================
# 4. Count tables and columns
# ============================================
echo -e "${BLUE}4️⃣ Analyzing schema...${NC}"

TABLES_COUNT=$(grep -c "^--- TABLE ---" database-schema.csv)
COLUMNS_COUNT=$(grep -c "^--- COLUMN ---" database-schema.csv)

echo "   Tables: $TABLES_COUNT"
echo "   Columns: $COLUMNS_COUNT"
echo ""

# ============================================
# 5. Remind to update documentation
# ============================================
echo -e "${YELLOW}5️⃣ Update Documentation:${NC}"
echo ""
echo "   Files to update:"
echo "   ├─ google-api-docs/DATABASE_SCHEMA.md"
echo "   └─ google-api-docs/DATABASE_QUICK_REF.md (if needed)"
echo ""
read -p "   Did you update the documentation? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Don't forget to update the documentation!${NC}"
    echo ""
    echo "   1. Open: google-api-docs/DATABASE_SCHEMA.md"
    echo "   2. Add/update table information"
    echo "   3. Update counts: $TABLES_COUNT tables, $COLUMNS_COUNT columns"
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Documentation updated${NC}"
echo ""

# ============================================
# 6. Git status
# ============================================
echo -e "${BLUE}6️⃣ Git Status:${NC}"
echo ""

# Check if files are staged
git status --short | grep -E "(database-schema\.csv|DATABASE_SCHEMA\.md|migrations/.*\.sql)" || true

echo ""

# ============================================
# 7. Suggest commit
# ============================================
echo -e "${YELLOW}7️⃣ Suggested commit:${NC}"
echo ""
echo "   git add supabase/migrations/*.sql"
echo "   git add database-schema.csv"
echo "   git add google-api-docs/DATABASE_SCHEMA.md"
echo "   git add google-api-docs/DATABASE_QUICK_REF.md"
echo "   git commit -m \"feat(db): [describe change] + update schema docs\""
echo ""

# ============================================
# 8. Ask to stage files
# ============================================
read -p "   Stage these files now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add database-schema.csv
    git add google-api-docs/DATABASE_SCHEMA.md
    git add google-api-docs/DATABASE_QUICK_REF.md
    
    # Add latest migration if exists
    if [ ! -z "$LATEST_MIGRATION" ]; then
        git add "$LATEST_MIGRATION"
    fi
    
    echo -e "${GREEN}✅ Files staged${NC}"
    echo ""
    echo "   Now run:"
    echo "   git commit -m \"feat(db): [your description] + update schema docs\""
else
    echo -e "${YELLOW}⚠️  Don't forget to stage and commit!${NC}"
fi

echo ""

# ============================================
# 9. Checklist
# ============================================
echo -e "${BLUE}9️⃣ Final Checklist:${NC}"
echo ""
echo "   [ ] Migration file created"
echo "   [ ] Schema exported (database-schema.csv)"
echo "   [ ] DATABASE_SCHEMA.md updated"
echo "   [ ] DATABASE_QUICK_REF.md updated (if needed)"
echo "   [ ] All files staged"
echo "   [ ] Ready to commit"
echo ""

echo "============================================"
echo -e "${GREEN}✅ Schema documentation update complete!${NC}"
echo "============================================"

