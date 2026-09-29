CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  restaurant_name text NOT NULL CHECK (char_length(restaurant_name) BETWEEN 2 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS owner_id uuid;
CREATE INDEX IF NOT EXISTS restaurants_owner_id_idx ON public.restaurants(owner_id);

CREATE TABLE public.google_review_snapshots (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  rating numeric(2,1),
  user_rating_count integer NOT NULL DEFAULT 0,
  google_maps_uri text,
  reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.google_review_snapshots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.google_review_snapshots TO authenticated;
GRANT ALL ON public.google_review_snapshots TO service_role;
ALTER TABLE public.google_review_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read Google review snapshots" ON public.google_review_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage Google review snapshots" ON public.google_review_snapshots FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));