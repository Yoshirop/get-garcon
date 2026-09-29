ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tip_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS google_review_url text;

UPDATE public.restaurants SET google_review_url = 'https://search.google.com/local/writereview?placeid=ChIJDemoSmashCo' WHERE slug = 'smash-co' AND google_review_url IS NULL;
UPDATE public.restaurants SET google_review_url = 'https://search.google.com/local/writereview?placeid=ChIJDemoPitaBar' WHERE slug = 'tel-aviv-pita' AND google_review_url IS NULL;