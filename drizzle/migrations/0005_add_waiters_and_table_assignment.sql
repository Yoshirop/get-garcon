CREATE TABLE public.waiters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'orange',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waiters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waiters TO authenticated;
GRANT ALL ON public.waiters TO service_role;

ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo open waiters" ON public.waiters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.restaurant_tables ADD COLUMN waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL;
