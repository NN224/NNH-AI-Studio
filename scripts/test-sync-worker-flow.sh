#!/bin/bash
#
# Test GMB Sync Worker Complete Flow
#
# This script:
# 1. Gets GMB accounts from database
# 2. Enqueues a test sync job
# 3. Triggers the worker
# 4. Shows the results
#

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://rrarhekwhgpgkakqrlyn.supabase.co}"
SERVICE_KEY="${1:-$SUPABASE_SERVICE_ROLE_KEY}"
TRIGGER_SECRET="${2:-0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1}"

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY required"
  echo ""
  echo "Usage:"
  echo "  $0 <SERVICE_ROLE_KEY> [TRIGGER_SECRET]"
  echo ""
  echo "Or set SUPABASE_SERVICE_ROLE_KEY environment variable"
  exit 1
fi

echo "🧪 GMB Sync Worker Flow Test"
echo "============================="
echo ""

# 1. Get a GMB account
echo "1️⃣  Fetching GMB accounts..."
ACCOUNTS=$(curl -s "${SUPABASE_URL}/rest/v1/gmb_accounts?select=id,account_name,user_id&limit=1" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

ACCOUNT_ID=$(echo "$ACCOUNTS" | jq -r '.[0].id // empty')
USER_ID=$(echo "$ACCOUNTS" | jq -r '.[0].user_id // empty')
ACCOUNT_NAME=$(echo "$ACCOUNTS" | jq -r '.[0].account_name // empty')

if [ -z "$ACCOUNT_ID" ]; then
  echo "   ❌ No GMB accounts found in database"
  echo "   💡 You need to connect a GMB account first"
  exit 1
fi

echo "   ✅ Found account: $ACCOUNT_NAME"
echo "   Account ID: $ACCOUNT_ID"
echo "   User ID: $USER_ID"
echo ""

# 2. Enqueue a sync job directly in database
echo "2️⃣  Enqueueing sync job..."
JOB_PAYLOAD=$(cat <<EOF
{
  "user_id": "$USER_ID",
  "account_id": "$ACCOUNT_ID",
  "sync_type": "full",
  "status": "pending",
  "priority": 10,
  "attempts": 0,
  "max_attempts": 3,
  "metadata": {
    "test": true,
    "created_by": "test-sync-worker-flow",
    "account_name": "$ACCOUNT_NAME"
  }
}
EOF
)

JOB_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/sync_queue" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$JOB_PAYLOAD")

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.[0].id // .id // empty')

if [ -z "$JOB_ID" ]; then
  echo "   ❌ Failed to enqueue job"
  echo "   Response: $JOB_RESPONSE"
  exit 1
fi

echo "   ✅ Job enqueued successfully"
echo "   Job ID: $JOB_ID"
echo ""

# 3. Check queue before worker
echo "3️⃣  Queue status before worker:"
QUEUE_BEFORE=$(curl -s "${SUPABASE_URL}/rest/v1/sync_queue?select=*&id=eq.$JOB_ID" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")
echo "$QUEUE_BEFORE" | jq '.[] | {id, status, sync_type, attempts}'
echo ""

# 4. Trigger the worker
echo "4️⃣  Triggering GMB sync worker..."
WORKER_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/gmb-sync-worker" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "X-Trigger-Secret: ${TRIGGER_SECRET}")

echo "$WORKER_RESPONSE" | jq '.'
echo ""

# 5. Check queue after worker
echo "5️⃣  Queue status after worker:"
sleep 2  # Give it a moment to complete
QUEUE_AFTER=$(curl -s "${SUPABASE_URL}/rest/v1/sync_queue?select=*&id=eq.$JOB_ID" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")
echo "$QUEUE_AFTER" | jq '.[] | {id, status, sync_type, attempts, last_error, completed_at}'
echo ""

# 6. Check worker run
echo "6️⃣  Worker run details:"
RUN_ID=$(echo "$WORKER_RESPONSE" | jq -r '.run_id // empty')
if [ -n "$RUN_ID" ]; then
  WORKER_RUN=$(curl -s "${SUPABASE_URL}/rest/v1/sync_worker_runs?select=*&id=eq.$RUN_ID" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}")
  echo "$WORKER_RUN" | jq '.[] | {run_id: .id, status, jobs_picked, jobs_processed, jobs_succeeded, jobs_failed, notes}'
else
  echo "   ⚠️  No run_id returned from worker"
fi
echo ""

# 7. Summary
echo "============================="
echo "✅ Test complete!"
echo ""
STATUS=$(echo "$QUEUE_AFTER" | jq -r '.[0].status // "unknown"')
if [ "$STATUS" = "succeeded" ]; then
  echo "🎉 Job processed successfully!"
elif [ "$STATUS" = "failed" ]; then
  echo "❌ Job failed"
  ERROR=$(echo "$QUEUE_AFTER" | jq -r '.[0].last_error // "unknown"')
  echo "   Error: $ERROR"
elif [ "$STATUS" = "processing" ]; then
  echo "⏳ Job still processing (may need more time)"
elif [ "$STATUS" = "pending" ]; then
  echo "⚠️  Job still pending (worker may not have picked it up)"
  echo "   Check that:"
  echo "   - RPC functions are deployed"
  echo "   - Worker has correct permissions"
else
  echo "❓ Job status: $STATUS"
fi
