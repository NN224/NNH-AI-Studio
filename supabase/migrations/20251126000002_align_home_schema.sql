-- Align DB columns with existing code expectations for Home page
-- Adds alias columns and trigger to populate location_name

-- gmb_locations: add missing columns if they don't exist
ALTER TABLE public.gmb_locations
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS response_rate numeric,
  ADD COLUMN IF NOT EXISTS health_score numeric,
  ADD COLUMN IF NOT EXISTS business_hours jsonb,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- gmb_reviews: add location_name column if missing
ALTER TABLE public.gmb_reviews
  ADD COLUMN IF NOT EXISTS location_name text;

-- Index helpful for queries using review_date
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_date ON public.gmb_reviews(review_date);

-- Trigger to backfill and maintain location_name on insert/update
CREATE OR REPLACE FUNCTION public.set_gmb_review_location_name()
RETURNS TRIGGER AS $$
BEGIN
  SELECT location_name INTO NEW.location_name FROM public.gmb_locations WHERE id = NEW.location_id LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_gmb_review_location_name_ins ON public.gmb_reviews;
CREATE TRIGGER trg_set_gmb_review_location_name_ins
  BEFORE INSERT ON public.gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_gmb_review_location_name();

DROP TRIGGER IF EXISTS trg_set_gmb_review_location_name_upd ON public.gmb_reviews;
CREATE TRIGGER trg_set_gmb_review_location_name_upd
  BEFORE UPDATE OF location_id ON public.gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_gmb_review_location_name();

-- Backfill existing rows
UPDATE public.gmb_reviews r
SET location_name = l.location_name
FROM public.gmb_locations l
WHERE r.location_id = l.id AND (r.location_name IS NULL OR r.location_name = '');

-- sync_status: add last_sync_error column if missing
ALTER TABLE public.sync_status
  ADD COLUMN IF NOT EXISTS last_sync_error text;

-- Lightweight RPC for average rating (used optionally by dashboard)
CREATE OR REPLACE FUNCTION public.calculate_average_rating(p_user_id uuid)
RETURNS TABLE (avg numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT AVG(rating)::numeric AS avg
  FROM public.gmb_reviews
  WHERE user_id = p_user_id;
$$;

SELECT 'Home schema alignment completed' AS result;
