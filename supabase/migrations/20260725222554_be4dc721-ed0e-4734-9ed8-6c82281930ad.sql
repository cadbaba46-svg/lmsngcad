ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_role_title text,
  ADD COLUMN IF NOT EXISTS allowed_admin_sections text[] NOT NULL DEFAULT '{}';