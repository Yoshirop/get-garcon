ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_google_place_id_length CHECK (google_place_id IS NULL OR char_length(google_place_id) BETWEEN 10 AND 255);