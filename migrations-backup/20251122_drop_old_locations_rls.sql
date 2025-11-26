-- Migration: Drop old user-based RLS policies on gmb_locations
-- Created: 2025-11-22
-- Description: Remove conflicting policies and rely on team-based RBAC policies

-- Drop old user-based policies that conflict with team RBAC
DROP POLICY IF EXISTS "Users can view their own locations" ON gmb_locations;
DROP POLICY IF EXISTS "Users can insert their own locations" ON gmb_locations;
DROP POLICY IF EXISTS "Users can update their own locations" ON gmb_locations;
DROP POLICY IF EXISTS "Users can delete their own locations" ON gmb_locations;

-- The team-based policies from 20251115_add_team_rbac.sql will handle all access:
-- - "Team members read locations" (SELECT)
-- - "Team editors manage locations" (INSERT)
-- - "Team editors update locations" (UPDATE)
-- - "Team admins delete locations" (DELETE)

COMMENT ON TABLE gmb_locations IS 'Google My Business locations - access controlled by team RBAC policies';
