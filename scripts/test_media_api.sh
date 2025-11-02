#!/bin/bash

# Script to test Google My Business Media API
# Usage: ./scripts/test_media_api.sh [location_resource]
# Example: ./scripts/test_media_api.sh accounts/1234567890/locations/11247391224469965786

LOCATION_RESOURCE="${1:-accounts/1234567890/locations/11247391224469965786}"
BASE_URL="https://mybusiness.googleapis.com/v4"

echo "🔍 Testing Google My Business Media API"
echo "======================================"
echo ""
echo "Location Resource: $LOCATION_RESOURCE"
echo ""

if [ -z "$GOOGLE_ACCESS_TOKEN" ]; then
  echo "❌ Error: GOOGLE_ACCESS_TOKEN environment variable not set"
  echo "   Get it from Supabase: SELECT access_token FROM gmb_accounts WHERE is_active = true LIMIT 1;"
  exit 1
fi

echo "📡 Testing Media Endpoints:"
echo ""

# Test 1: List media
echo "1️⃣  Testing: GET ${BASE_URL}/${LOCATION_RESOURCE}/media"
echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" \"${BASE_URL}/${LOCATION_RESOURCE}/media?pageSize=50\""
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "${BASE_URL}/${LOCATION_RESOURCE}/media?pageSize=50")

HTTP_CODE=$(echo "$RESPONSE" | grep -oP 'HTTP_CODE:\K.*')
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ Success!"
  
  # Extract media count
  MEDIA_COUNT=$(echo "$BODY" | jq '.mediaItems | length' 2>/dev/null || echo "0")
  echo "   Media Items: $MEDIA_COUNT"
  
  if [ "$MEDIA_COUNT" -gt "0" ]; then
    echo ""
    echo "   Sample Media Items:"
    echo "$BODY" | jq '.mediaItems[0:2] | .[] | {name: .name, mediaFormat: .mediaFormat, googleUrl: .googleUrl}' 2>/dev/null || echo "   (Unable to parse)"
  fi
  
  echo ""
  echo "   Full Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY" | head -100
else
  echo "   ❌ Failed"
  echo "   Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""
echo "---"
echo ""

# Test 2: List with pagination (if nextPageToken exists)
if [ "$HTTP_CODE" == "200" ]; then
  NEXT_TOKEN=$(echo "$BODY" | jq -r '.nextPageToken // empty' 2>/dev/null)
  if [ -n "$NEXT_TOKEN" ] && [ "$NEXT_TOKEN" != "null" ]; then
    echo "2️⃣  Testing: GET with nextPageToken"
    echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" \"${BASE_URL}/${LOCATION_RESOURCE}/media?pageSize=50&pageToken=${NEXT_TOKEN}\""
    echo ""
    
    RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
      -H "Accept: application/json" \
      "${BASE_URL}/${LOCATION_RESOURCE}/media?pageSize=50&pageToken=${NEXT_TOKEN}")
    
    HTTP_CODE2=$(echo "$RESPONSE2" | grep -oP 'HTTP_CODE:\K.*')
    BODY2=$(echo "$RESPONSE2" | sed '/HTTP_CODE:/d')
    
    echo "   Status: $HTTP_CODE2"
    if [ "$HTTP_CODE2" == "200" ]; then
      MEDIA_COUNT2=$(echo "$BODY2" | jq '.mediaItems | length' 2>/dev/null || echo "0")
      echo "   ✅ Success! Additional items: $MEDIA_COUNT2"
    else
      echo "   ❌ Failed"
      echo "   Response:"
      echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
    fi
    echo ""
    echo "---"
    echo ""
  fi
fi

echo "✅ Testing complete"
echo ""
echo "📝 To use this script:"
echo "   export GOOGLE_ACCESS_TOKEN='your_token_here'"
echo "   ./scripts/test_media_api.sh accounts/{account_id}/locations/{location_id}"
echo ""
echo "💡 Get location resource from Supabase:"
echo "   SELECT 'accounts/' || a.account_id || '/locations/' || REPLACE(l.location_id, 'locations/', '')"
echo "   FROM gmb_locations l"
echo "   JOIN gmb_accounts a ON a.id = l.gmb_account_id"
echo "   WHERE a.is_active = true LIMIT 1;"

