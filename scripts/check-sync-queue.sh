#!/bin/bash
#
# Check Sync Queue Status
# This script uses the Edge Function to check RPC function directly
#

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://rrarhekwhgpgkakqrlyn.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
TRIGGER_SECRET="${TRIGGER_SECRET:-0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1}"

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  echo "Set it in your environment or .env.local file"
  exit 1
fi

echo "🔍 Checking GMB Sync Queue Status"
echo "=================================="
echo ""

# Check worker runs
echo "📊 Recent Worker Runs:"
curl -s "${SUPABASE_URL}/rest/v1/sync_worker_runs?select=*&order=created_at.desc&limit=5" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  | jq '.'

echo ""
echo "📋 Sync Queue Contents:"
curl -s "${SUPABASE_URL}/rest/v1/sync_queue?select=*&order=created_at.desc&limit=10" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  | jq '.'

echo ""
echo "📈 Queue Statistics:"
curl -s "${SUPABASE_URL}/rest/v1/sync_queue?select=status" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  | jq 'group_by(.status) | map({status: .[0].status, count: length})'

echo ""
echo "🔧 GMB Accounts:"
curl -s "${SUPABASE_URL}/rest/v1/gmb_accounts?select=id,account_name,user_id&limit=5" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  | jq '.'
