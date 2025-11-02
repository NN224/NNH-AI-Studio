#!/bin/bash

# Script to test Google My Business Q&A API
# Usage: ./scripts/test_qa_api.sh [location_resource]

LOCATION_RESOURCE="${1:-locations/11247391224469965786}"
BASE_URL="https://mybusinessqanda.googleapis.com/v1"

echo "🔍 Testing Google My Business Q&A API"
echo "======================================"
echo ""
echo "Location Resource: $LOCATION_RESOURCE"
echo ""

if [ -z "$GOOGLE_ACCESS_TOKEN" ]; then
  echo "❌ Error: GOOGLE_ACCESS_TOKEN environment variable not set"
  echo "   Get it from Supabase: SELECT access_token FROM gmb_accounts WHERE is_active = true LIMIT 1;"
  exit 1
fi

echo "📡 Testing Q&A Endpoints:"
echo ""

# Test 1: List questions
echo "1️⃣  Testing: GET ${BASE_URL}/${LOCATION_RESOURCE}/questions"
echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" \"${BASE_URL}/${LOCATION_RESOURCE}/questions\""
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "${BASE_URL}/${LOCATION_RESOURCE}/questions")

HTTP_CODE=$(echo "$RESPONSE" | grep -oP 'HTTP_CODE:\K.*')
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ Success!"
  echo "   Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "   ❌ Failed"
  echo "   Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""
echo "---"
echo ""

# Test 2: List with query parameters
echo "2️⃣  Testing: GET with pageSize"
echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" \"${BASE_URL}/${LOCATION_RESOURCE}/questions?pageSize=10\""
echo ""

RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "${BASE_URL}/${LOCATION_RESOURCE}/questions?pageSize=10")

HTTP_CODE2=$(echo "$RESPONSE2" | grep -oP 'HTTP_CODE:\K.*')
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_CODE:/d')

echo "   Status: $HTTP_CODE2"
if [ "$HTTP_CODE2" == "200" ]; then
  echo "   ✅ Success!"
  echo "   Response:"
  echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2" | head -50
else
  echo "   ❌ Failed"
  echo "   Response:"
  echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
fi
echo ""
echo "---"
echo ""

echo "✅ Testing complete"
echo ""
echo "📝 To use this script:"
echo "   export GOOGLE_ACCESS_TOKEN='your_token_here'"
echo "   ./scripts/test_qa_api.sh [location_resource]"

