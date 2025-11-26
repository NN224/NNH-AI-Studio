-- Update gmb_reviews.status constraint to allow responded/pending states used by application

ALTER TABLE public.gmb_reviews
  DROP CONSTRAINT IF EXISTS gmb_reviews_status_check;

ALTER TABLE public.gmb_reviews
  ADD CONSTRAINT gmb_reviews_status_check
  CHECK (status IN ('pending', 'in_progress', 'responded', 'flagged', 'archived', 'new'));

ALTER TABLE public.gmb_reviews
  ALTER COLUMN status SET DEFAULT 'pending';

