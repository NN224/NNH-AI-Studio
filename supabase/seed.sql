-- =====================================================
-- SEED DATA FOR LOCAL TESTING
-- =====================================================
-- Description: Dummy data for testing GMB sync locally
-- Usage: Run after migrations to populate test data
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: CREATE TEST USERS
-- =====================================================

-- Insert test user (requires auth.users to exist)
-- Note: In production, users are created via Supabase Auth
-- This is just for local testing

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_test_user_id_2 UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Check if test users exist in auth.users
  -- If not, you'll need to create them via Supabase Auth UI or API

  -- Insert test profiles
  INSERT INTO profiles (id, full_name, subscription_plan, onboarding_completed)
  VALUES
    (v_test_user_id, 'Test User 1', 'pro', true),
    (v_test_user_id_2, 'Test User 2', 'free', true)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Test profiles created';
END $$;

-- =====================================================
-- STEP 2: CREATE TEST GMB ACCOUNTS
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_test_user_id_2 UUID := '00000000-0000-0000-0000-000000000002';
  v_account_1_id UUID;
  v_account_2_id UUID;
  v_account_3_id UUID;
BEGIN
  -- Active account for user 1
  INSERT INTO gmb_accounts (
    user_id,
    email,
    account_name,
    account_id,
    token_expires_at,
    is_active,
    last_synced_at
  )
  VALUES (
    v_test_user_id,
    'test1@example.com',
    'Test Business 1',
    'accounts/123456789',
    NOW() + INTERVAL '1 hour',
    true,
    NOW() - INTERVAL '30 minutes'
  )
  RETURNING id INTO v_account_1_id;

  -- Insert secrets for account 1 (encrypted tokens)
  INSERT INTO gmb_secrets (account_id, access_token, refresh_token)
  VALUES (
    v_account_1_id,
    'encrypted_access_token_1',
    'encrypted_refresh_token_1'
  );

  -- Active account for user 2
  INSERT INTO gmb_accounts (
    user_id,
    email,
    account_name,
    account_id,
    token_expires_at,
    is_active,
    last_synced_at
  )
  VALUES (
    v_test_user_id_2,
    'test2@example.com',
    'Test Business 2',
    'accounts/987654321',
    NOW() + INTERVAL '2 hours',
    true,
    NOW() - INTERVAL '1 hour'
  )
  RETURNING id INTO v_account_2_id;

  -- Insert secrets for account 2
  INSERT INTO gmb_secrets (account_id, access_token, refresh_token)
  VALUES (
    v_account_2_id,
    'encrypted_access_token_2',
    'encrypted_refresh_token_2'
  );

  -- Inactive account for user 1 (should NOT be synced)
  INSERT INTO gmb_accounts (
    user_id,
    email,
    account_name,
    account_id,
    token_expires_at,
    is_active,
    last_synced_at,
    last_error
  )
  VALUES (
    v_test_user_id,
    'inactive@example.com',
    'Inactive Business',
    'accounts/111111111',
    NOW() - INTERVAL '1 day',
    false,
    NOW() - INTERVAL '7 days',
    'Token expired'
  )
  RETURNING id INTO v_account_3_id;

  -- Insert secrets for inactive account
  INSERT INTO gmb_secrets (account_id, access_token, refresh_token)
  VALUES (
    v_account_3_id,
    'encrypted_access_token_3',
    'encrypted_refresh_token_3'
  );

  RAISE NOTICE 'Test GMB accounts created: % active, 1 inactive', 2;
END $$;

-- =====================================================
-- STEP 3: CREATE TEST LOCATIONS
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_account_1_id UUID;
  v_location_1_id UUID;
  v_location_2_id UUID;
BEGIN
  -- Get account ID
  SELECT id INTO v_account_1_id
  FROM gmb_accounts
  WHERE account_id = 'accounts/123456789';

  -- Location 1
  INSERT INTO gmb_locations (
    gmb_account_id,
    user_id,
    location_id,
    normalized_location_id,
    location_name,
    address,
    phone,
    website,
    category,
    latitude,
    longitude,
    rating,
    review_count,
    profile_completeness,
    is_active,
    status
  )
  VALUES (
    v_account_1_id,
    v_test_user_id,
    'accounts/123456789/locations/111',
    'accounts_123456789_locations_111',
    'Downtown Coffee Shop',
    '123 Main St, Dubai, UAE',
    '+971-4-123-4567',
    'https://example.com',
    'Coffee Shop',
    25.2048,
    55.2708,
    4.5,
    150,
    0.85,
    true,
    'OPEN'
  )
  RETURNING id INTO v_location_1_id;

  -- Location 2
  INSERT INTO gmb_locations (
    gmb_account_id,
    user_id,
    location_id,
    normalized_location_id,
    location_name,
    address,
    phone,
    category,
    latitude,
    longitude,
    rating,
    review_count,
    profile_completeness,
    is_active,
    status
  )
  VALUES (
    v_account_1_id,
    v_test_user_id,
    'accounts/123456789/locations/222',
    'accounts_123456789_locations_222',
    'Marina Restaurant',
    '456 Beach Rd, Dubai, UAE',
    '+971-4-987-6543',
    'Restaurant',
    25.0772,
    55.1309,
    4.2,
    89,
    0.75,
    true,
    'OPEN'
  )
  RETURNING id INTO v_location_2_id;

  RAISE NOTICE 'Test locations created: %', 2;
END $$;

-- =====================================================
-- STEP 4: CREATE TEST REVIEWS
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_account_1_id UUID;
  v_location_1_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_account_1_id
  FROM gmb_accounts
  WHERE account_id = 'accounts/123456789';

  SELECT id INTO v_location_1_id
  FROM gmb_locations
  WHERE location_id = 'accounts/123456789/locations/111';

  -- Review 1 (with reply)
  INSERT INTO gmb_reviews (
    user_id,
    location_id,
    google_location_id,
    gmb_account_id,
    review_id,
    google_name,
    reviewer_name,
    reviewer_display_name,
    rating,
    review_text,
    reply_text,
    review_date,
    reply_date,
    has_reply,
    sentiment,
    status
  )
  VALUES (
    v_test_user_id,
    v_location_1_id,
    'accounts/123456789/locations/111',
    v_account_1_id,
    'review_001',
    'accounts/123456789/locations/111/reviews/review_001',
    'John Doe',
    'John D.',
    5,
    'Amazing coffee and great service!',
    'Thank you for your kind words!',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day',
    true,
    'positive',
    'responded'
  );

  -- Review 2 (pending reply)
  INSERT INTO gmb_reviews (
    user_id,
    location_id,
    google_location_id,
    gmb_account_id,
    review_id,
    google_name,
    reviewer_name,
    reviewer_display_name,
    rating,
    review_text,
    review_date,
    has_reply,
    sentiment,
    status
  )
  VALUES (
    v_test_user_id,
    v_location_1_id,
    'accounts/123456789/locations/111',
    v_account_1_id,
    'review_002',
    'accounts/123456789/locations/111/reviews/review_002',
    'Jane Smith',
    'Jane S.',
    4,
    'Good coffee but a bit pricey.',
    NOW() - INTERVAL '1 day',
    false,
    'neutral',
    'pending'
  );

  -- Review 3 (negative, pending)
  INSERT INTO gmb_reviews (
    user_id,
    location_id,
    google_location_id,
    gmb_account_id,
    review_id,
    google_name,
    reviewer_name,
    reviewer_display_name,
    rating,
    review_text,
    review_date,
    has_reply,
    sentiment,
    status
  )
  VALUES (
    v_test_user_id,
    v_location_1_id,
    'accounts/123456789/locations/111',
    v_account_1_id,
    'review_003',
    'accounts/123456789/locations/111/reviews/review_003',
    'Bob Wilson',
    'Bob W.',
    2,
    'Service was slow and coffee was cold.',
    NOW() - INTERVAL '3 hours',
    false,
    'negative',
    'pending'
  );

  RAISE NOTICE 'Test reviews created: %', 3;
END $$;

-- =====================================================
-- STEP 5: CREATE TEST QUESTIONS
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_account_1_id UUID;
  v_location_1_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_account_1_id
  FROM gmb_accounts
  WHERE account_id = 'accounts/123456789';

  SELECT id INTO v_location_1_id
  FROM gmb_locations
  WHERE location_id = 'accounts/123456789/locations/111';

  -- Question 1 (answered)
  INSERT INTO gmb_questions (
    user_id,
    location_id,
    google_location_id,
    gmb_account_id,
    question_id,
    question_text,
    answer_text,
    author_name,
    author_display_name,
    author_type,
    question_date,
    answer_date,
    answer_author,
    answer_status,
    upvote_count,
    status
  )
  VALUES (
    v_test_user_id,
    v_location_1_id,
    'accounts/123456789/locations/111',
    v_account_1_id,
    'question_001',
    'Do you have WiFi?',
    'Yes, we offer free WiFi to all customers!',
    'Sarah Johnson',
    'Sarah J.',
    'CUSTOMER',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days',
    'Business Owner',
    'answered',
    3,
    'answered'
  );

  -- Question 2 (pending)
  INSERT INTO gmb_questions (
    user_id,
    location_id,
    google_location_id,
    gmb_account_id,
    question_id,
    question_text,
    author_name,
    author_display_name,
    author_type,
    question_date,
    answer_status,
    upvote_count,
    status
  )
  VALUES (
    v_test_user_id,
    v_location_1_id,
    'accounts/123456789/locations/111',
    v_account_1_id,
    'question_002',
    'What are your opening hours on weekends?',
    'Mike Brown',
    'Mike B.',
    'CUSTOMER',
    NOW() - INTERVAL '1 day',
    'pending',
    1,
    'pending'
  );

  RAISE NOTICE 'Test questions created: %', 2;
END $$;

-- =====================================================
-- STEP 6: CREATE TEST PERFORMANCE METRICS
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_account_1_id UUID;
  v_date DATE;
BEGIN
  -- Get account ID
  SELECT id INTO v_account_1_id
  FROM gmb_accounts
  WHERE account_id = 'accounts/123456789';

  -- Insert metrics for last 7 days
  FOR i IN 0..6 LOOP
    v_date := CURRENT_DATE - i;

    INSERT INTO gmb_performance_metrics (
      user_id,
      location_id,
      gmb_account_id,
      metric_date,
      views_search,
      views_maps,
      website_clicks,
      phone_calls,
      direction_requests,
      total_searches
    )
    VALUES (
      v_test_user_id,
      'accounts/123456789/locations/111',
      v_account_1_id,
      v_date,
      50 + (i * 5),
      30 + (i * 3),
      10 + i,
      5 + i,
      8 + i,
      80 + (i * 8)
    );
  END LOOP;

  RAISE NOTICE 'Test performance metrics created for last 7 days';
END $$;

-- =====================================================
-- STEP 7: CREATE TEST SYNC QUEUE ENTRIES
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_account_1_id UUID;
BEGIN
  -- Get account ID
  SELECT id INTO v_account_1_id
  FROM gmb_accounts
  WHERE account_id = 'accounts/123456789';

  -- Completed sync
  INSERT INTO sync_queue (
    user_id,
    account_id,
    sync_type,
    status,
    scheduled_at,
    started_at,
    completed_at,
    metadata
  )
  VALUES (
    v_test_user_id,
    v_account_1_id,
    'full',
    'completed',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '55 minutes',
    NOW() - INTERVAL '50 minutes',
    '{"locations_synced": 2, "reviews_synced": 3, "questions_synced": 2}'::jsonb
  );

  -- Pending sync
  INSERT INTO sync_queue (
    user_id,
    account_id,
    sync_type,
    status,
    scheduled_at
  )
  VALUES (
    v_test_user_id,
    v_account_1_id,
    'incremental',
    'pending',
    NOW()
  );

  RAISE NOTICE 'Test sync queue entries created';
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show summary of seeded data
SELECT
  'GMB Accounts' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE is_active = true) AS active_rows
FROM gmb_accounts

UNION ALL

SELECT
  'GMB Locations',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true)
FROM gmb_locations

UNION ALL

SELECT
  'GMB Reviews',
  COUNT(*),
  COUNT(*) FILTER (WHERE has_reply = false)
FROM gmb_reviews

UNION ALL

SELECT
  'GMB Questions',
  COUNT(*),
  COUNT(*) FILTER (WHERE answer_status = 'pending')
FROM gmb_questions

UNION ALL

SELECT
  'GMB Secrets',
  COUNT(*),
  NULL
FROM gmb_secrets

UNION ALL

SELECT
  'Sync Queue',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'pending')
FROM sync_queue;

-- =====================================================
-- SEED COMPLETED
-- =====================================================

SELECT 'Seed data created successfully! Ready for local testing.' AS result;
