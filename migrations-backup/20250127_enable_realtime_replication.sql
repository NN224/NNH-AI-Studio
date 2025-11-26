-- Migration: Enable real-time replication for dashboard tables
-- Created: 2025-01-27
-- Description: Enables real-time subscriptions for gmb_reviews, gmb_questions, and gmb_locations

-- Enable replication for real-time subscriptions
ALTER TABLE gmb_reviews REPLICA IDENTITY FULL;
ALTER TABLE gmb_questions REPLICA IDENTITY FULL;
ALTER TABLE gmb_locations REPLICA IDENTITY FULL;

-- Add comments for documentation
COMMENT ON TABLE gmb_reviews IS 'Real-time enabled: Changes broadcast to subscribed clients';
COMMENT ON TABLE gmb_questions IS 'Real-time enabled: Changes broadcast to subscribed clients';
COMMENT ON TABLE gmb_locations IS 'Real-time enabled: Updates broadcast to subscribed clients';

