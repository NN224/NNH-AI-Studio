#!/bin/bash

# AI Command Center Setup Verification Script
# This script checks that all new components are properly installed and configured

echo "🚀 AI Command Center Setup Verification"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if framer-motion is installed
echo -e "\n📦 Checking dependencies..."
if [ -d "node_modules/framer-motion" ]; then
    echo -e "${GREEN}✅ framer-motion is installed${NC}"
else
    echo -e "${RED}❌ framer-motion is not installed${NC}"
    echo "Run: npm install framer-motion"
fi

# Check if all new files exist
echo -e "\n📁 Checking new files..."
files=(
    "components/ai-command-center/ai/ai-hero-chat.tsx"
    "components/ai-command-center/error-boundary.tsx"
    "hooks/use-ai-command-center.ts"
    "app/[locale]/(dashboard)/ai-command-center/layout.tsx"
    "app/[locale]/(dashboard)/ai-command-center/page.tsx"
    "components/ai-command-center/README.md"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file is missing${NC}"
        all_exist=false
    fi
done

# Check updated files
echo -e "\n📝 Checking updated files..."
updated_files=(
    "components/ai-command-center/ai/ai-companion-sidebar.tsx"
)

for file in "${updated_files[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "framer-motion" "$file"; then
            echo -e "${GREEN}✅ $file is updated with framer-motion${NC}"
        else
            echo -e "${YELLOW}⚠️  $file exists but may not be updated${NC}"
        fi
    else
        echo -e "${RED}❌ $file is missing${NC}"
    fi
done

# Summary
echo -e "\n📊 Summary"
echo "=========="
if [ "$all_exist" = true ]; then
    echo -e "${GREEN}✅ All files are properly installed!${NC}"
    echo -e "\n🎉 AI Command Center is ready to use!"
    echo -e "\nTo start the development server:"
    echo -e "${YELLOW}npm run dev${NC}"
    echo -e "\nThen navigate to:"
    echo -e "${YELLOW}http://localhost:5050/ai-command-center${NC}"
else
    echo -e "${RED}❌ Some files are missing. Please check the installation.${NC}"
fi

echo -e "\n📚 Documentation: components/ai-command-center/README.md"
echo -e "\n💡 Next steps:"
echo "1. Connect your AI API endpoints in hooks/use-ai-command-center.ts"
echo "2. Add your OpenAI/Anthropic API keys to .env.local"
echo "3. Update the business info fetching logic"
echo "4. Test the chat functionality"
