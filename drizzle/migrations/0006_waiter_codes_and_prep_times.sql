ALTER TABLE public.waiters ADD COLUMN IF NOT EXISTS access_code text;
CREATE UNIQUE INDEX IF NOT EXISTS waiters_access_code_key ON public.waiters (access_code) WHERE access_code IS NOT NULL;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS ready_at timestamptz;

UPDATE public.waiters SET access_code = lpad(((abs(hashtext(id::text)) % 9000) + 1000)::text, 4, '0') WHERE access_code IS NULL;