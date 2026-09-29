ALTER TABLE public.waiters
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'serveur';

ALTER TABLE public.waiters
  ADD CONSTRAINT waiters_role_valid CHECK (role IN ('serveur', 'chef_de_rang', 'manager'));
