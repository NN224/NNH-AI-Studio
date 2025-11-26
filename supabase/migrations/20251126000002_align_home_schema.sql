-- Align DB columns with existing code expectations for Home page
-- Adds alias columns and trigger to populate location_name

-- gmb_reviews: add alias columns
ALTER TABLE public.gmb_reviews
  ADD COLUMN IF NOT EXISTS rating integer GENERATED ALWAYS AS (star_rating) STORED,
  ADD COLUMN IF NOT EXISTS review_date timestamptz GENERATED ALWAYS AS (create_time) STORED,
  ADD COLUMN IF NOT EXISTS reply_text text GENERATED ALWAYS AS (review_reply) STORED,
  ADD COLUMN IF NOT EXISTS review_id text GENERATED ALWAYS AS (external_review_id) STORED,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz GENERATED ALWAYS AS (CASE WHEN has_reply THEN update_time ELSE NULL END) STORED,
  ADD COLUMN IF NOT EXISTS location_name text;

-- Index helpful for queries using review_date
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_date ON public.gmb_reviews(review_date);

-- Trigger to backfill and maintain location_name on insert/update
CREATE OR REPLACE FUNCTION public.set_gmb_review_location_name()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name INTO NEW.location_name FROM public.gmb_locations WHERE id = NEW.location_id LIMIT 1;
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
SET location_name = l.name
FROM public.gmb_locations l
WHERE r.location_id = l.id AND (r.location_name IS NULL OR r.location_name = '');

-- sync_status: alias for last_sync_error used by UI
ALTER TABLE public.sync_status
  ADD COLUMN IF NOT EXISTS last_sync_error text GENERATED ALWAYS AS (error) STORED;

-- Lightweight RPC for average rating (used optionally by dashboard)
CREATE OR REPLACE FUNCTION public.calculate_average_rating(p_user_id uuid)
RETURNS TABLE (avg numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT AVG(star_rating)::numeric AS avg
  FROM public.gmb_reviews
  WHERE user_id = p_user_id;
$$;

SELECT 'Home schema alignment completed' AS result;
