-- Demo restaurant app: open access (no auth), pilot demo mode.

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Mains',
  price_cents integer NOT NULL DEFAULT 0,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open menu_items" ON public.menu_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL UNIQUE,
  seats integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO anon, authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open tables" ON public.restaurant_tables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'orange',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO anon, authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open guests" ON public.guests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE,
  guest_name text NOT NULL DEFAULT 'Guest',
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  unit_price_cents integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  paid boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open order_items" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL,
  guest_name text NOT NULL DEFAULT 'Guest',
  amount_cents integer NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'demo_card',
  mode text NOT NULL DEFAULT 'mine',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL,
  kind text NOT NULL DEFAULT 'waiter',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO anon, authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open service_requests" ON public.service_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

INSERT INTO public.restaurant_tables (number, seats) VALUES
  (1, 2), (2, 2), (4, 4), (7, 4), (12, 5), (14, 6);

INSERT INTO public.menu_items (name, description, category, price_cents, sort_order) VALUES
  ('The Classic Smash', 'Two beef patties, cheddar, pickles, house sauce', 'Burgers', 1290, 1),
  ('Hot Honey Chicken', 'Buttermilk fried chicken, hot honey, slaw', 'Burgers', 1390, 2),
  ('Truffle Shroom', 'Mushrooms, truffle mayo, Swiss cheese', 'Burgers', 1490, 3),
  ('Skin-on fries', 'Crispy fries with rosemary salt', 'Sides', 450, 4),
  ('Coleslaw', 'Fresh cabbage, carrot, creamy dressing', 'Sides', 390, 5),
  ('Vanilla milkshake', 'Real vanilla, whipped cream', 'Drinks', 650, 6),
  ('Homemade lemonade', 'Lemon, mint, sparkling water', 'Drinks', 490, 7),
  ('Craft beer', 'Local pale ale, 33cl', 'Drinks', 690, 8),
  ('Chocolate cookie', 'Warm, gooey centre', 'Desserts', 350, 9);