-- =====================================================
-- SEED DATA FOR LOCAL TESTING
-- =====================================================

BEGIN;

-- 1. Create Test Users in auth.users (CRITICAL STEP)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'test1@example.com',
    crypt('password123', gen_salt('bf')), -- Password is "password123"
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test User 1"}',
    FALSE,
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'test2@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test User 2"}',
    FALSE,
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Create User Profiles (Public Table)
INSERT INTO public.profiles (id, full_name, subscription_plan, onboarding_completed)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test User 1', 'pro', true),
  ('00000000-0000-0000-0000-000000000002', 'Test User 2', 'free', true)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name;

-- 3. Create GMB Accounts
INSERT INTO public.gmb_accounts (
  id, user_id, email, account_name, account_id, is_active, last_synced_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'test1@example.com',
    'Test Business 1',
    'accounts/123456789',
    true,
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Secrets (Tokens)
INSERT INTO public.gmb_secrets (account_id, access_token, refresh_token)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'encrypted_access_token_1',
    'encrypted_refresh_token_1'
  )
ON CONFLICT (account_id) DO NOTHING;

-- 5. Insert Locations
INSERT INTO public.gmb_locations (
  gmb_account_id, user_id, location_id, normalized_location_id, location_name, is_active, status
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'accounts/123456789/locations/111',
    'accounts_123456789_locations_111',
    'Downtown Coffee Shop',
    true,
    'OPEN'
  )
ON CONFLICT (location_id) DO NOTHING;

-- 6. Insert a Pending Sync Job (For Worker Testing)
INSERT INTO public.sync_queue (
  user_id, account_id, sync_type, status, priority, scheduled_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'full',
    'pending',
    10,
    NOW()
  );

COMMIT;
