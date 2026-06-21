ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '{}'::jsonb;