#!/bin/bash

# Script to execute production readiness migrations using Supabase CLI
# Created: 2025-11-14

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "supabase/config.toml" ]; then
    print_error "No supabase/config.toml found. Are you in the project root?"
    exit 1
fi

echo "========================================"
echo "Production Readiness Migrations Executor"
echo "========================================"
echo ""

# List of migrations to execute
MIGRATIONS=(
    # "20251114_create_error_logs_table.sql" # Skip - already executed
    "20251114_add_performance_indexes.sql"
    "20251114_normalize_review_fields_safe.sql"
    "20251114_add_response_rate_function.sql"
    "20251114_add_health_score_calculation.sql"
    "20251114_add_dashboard_trends_function.sql"
    "20251114_add_ml_sentiment_fields.sql"
    "20251114_create_monitoring_tables.sql"
)

# Backup warning
print_warning "This will execute production readiness migrations on your Supabase database."
print_warning "Make sure you have a backup before proceeding!"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cancelled by user"
    exit 0
fi

# Execute migrations
FAILED=0
SUCCEEDED=0

for migration in "${MIGRATIONS[@]}"; do
    echo ""
    print_info "Executing: $migration"
    
    if [ ! -f "supabase/migrations/$migration" ]; then
        print_error "Migration file not found: $migration"
        ((FAILED++))
        continue
    fi
    
    # Execute migration
    if supabase db push --file "supabase/migrations/$migration" 2>&1; then
        print_status "Successfully executed: $migration"
        ((SUCCEEDED++))
    else
        print_error "Failed to execute: $migration"
        ((FAILED++))
        
        # Ask if we should continue
        read -p "Continue with remaining migrations? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            break
        fi
    fi
done

# Summary
echo ""
echo "========================================"
echo "Migration Summary"
echo "========================================"
print_status "Succeeded: $SUCCEEDED"
if [ $FAILED -gt 0 ]; then
    print_error "Failed: $FAILED"
else
    print_info "Failed: 0"
fi

# Final notes
if [ $FAILED -eq 0 ]; then
    echo ""
    print_status "All migrations completed successfully! 🚀"
    print_info "Your database is now production-ready."
else
    echo ""
    print_warning "Some migrations failed. Please check the errors above."
    print_info "You may need to run failed migrations manually in the SQL Editor."
fi

echo ""
echo "========================================"

# Cleanup recommendation
if [ $SUCCEEDED -eq ${#MIGRATIONS[@]} ]; then
    echo ""
    print_info "Recommended next steps:"
    echo "  1. Test your application thoroughly"
    echo "  2. Monitor the new performance metrics"
    echo "  3. Consider removing deprecated columns after verification"
    echo ""
    print_info "To drop deprecated columns, run:"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS comment;"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS review_reply;"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS response_text;"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS response;"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS has_response;"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS responded_at;"
    echo "  ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS reply_date;"
fi
