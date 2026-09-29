CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_he text,
  city text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO anon, authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open restaurants" ON public.restaurants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.restaurants (slug, name, name_he, city)
VALUES ('smash-co', 'Smash & Co', 'סמאש אנד קו', 'Paris');

ALTER TABLE public.menu_items ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.restaurant_tables ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.guests ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.service_requests ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;

UPDATE public.menu_items SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'smash-co') WHERE restaurant_id IS NULL;
UPDATE public.restaurant_tables SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'smash-co') WHERE restaurant_id IS NULL;
UPDATE public.guests SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'smash-co') WHERE restaurant_id IS NULL;
UPDATE public.order_items SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'smash-co') WHERE restaurant_id IS NULL;
UPDATE public.payments SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'smash-co') WHERE restaurant_id IS NULL;
UPDATE public.service_requests SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'smash-co') WHERE restaurant_id IS NULL;

ALTER TABLE public.restaurant_tables DROP CONSTRAINT IF EXISTS restaurant_tables_number_key;
CREATE UNIQUE INDEX restaurant_tables_resto_number_key ON public.restaurant_tables (restaurant_id, number);
CREATE INDEX order_items_resto_idx ON public.order_items (restaurant_id);
CREATE INDEX menu_items_resto_idx ON public.menu_items (restaurant_id);
CREATE INDEX payments_resto_idx ON public.payments (restaurant_id);
CREATE INDEX service_requests_resto_idx ON public.service_requests (restaurant_id);
CREATE INDEX guests_resto_idx ON public.guests (restaurant_id);