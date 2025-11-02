#!/bin/bash

# Script to test Google Business Information API directly
# Usage: ./scripts/test_google_api.sh [location_resource]

LOCATION_RESOURCE="${1:-locations/11247391224469965786}"
BASE_URL="https://mybusinessbusinessinformation.googleapis.com/v1"

echo "🔍 Testing Google Business Information API"
echo "=========================================="
echo ""
echo "Location Resource: $LOCATION_RESOURCE"
echo ""

# Get access token from Supabase (you need to set this)
if [ -z "$GOOGLE_ACCESS_TOKEN" ]; then
  echo "❌ Error: GOOGLE_ACCESS_TOKEN environment variable not set"
  echo "   Get it from: SELECT access_token FROM gmb_accounts WHERE is_active = true LIMIT 1;"
  exit 1
fi

echo "📡 Testing Endpoints:"
echo ""

# Test 1: GET location attributes
echo "1️⃣  Testing: GET ${BASE_URL}/${LOCATION_RESOURCE}/attributes"
echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" \"${BASE_URL}/${LOCATION_RESOURCE}/attributes\""
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "${BASE_URL}/${LOCATION_RESOURCE}/attributes")

HTTP_CODE=$(echo "$RESPONSE" | grep -oP 'HTTP_CODE:\K.*')
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "   Status: $HTTP_CODE"
echo "   Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "---"
echo ""

# Test 2: Try with readMask
echo "2️⃣  Testing: GET with readMask"
echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" \"${BASE_URL}/${LOCATION_RESOURCE}/attributes?readMask=attributes.name,attributes.valueType\""
echo ""

RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "${BASE_URL}/${LOCATION_RESOURCE}/attributes?readMask=attributes.name,attributes.valueType")

HTTP_CODE2=$(echo "$RESPONSE2" | grep -oP 'HTTP_CODE:\K.*')
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_CODE:/d')

echo "   Status: $HTTP_CODE2"
echo "   Response:"
echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
echo ""
echo "---"
echo ""

echo "✅ Testing complete"
echo ""
echo "📝 To use this script:"
echo "   export GOOGLE_ACCESS_TOKEN='your_token_here'"
echo "   ./scripts/test_google_api.sh [location_resource]"

