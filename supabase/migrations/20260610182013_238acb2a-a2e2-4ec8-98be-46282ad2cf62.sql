
-- 1) New private credentials table
CREATE TABLE IF NOT EXISTS public.profile_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No grants to anon/authenticated — service role only
GRANT ALL ON public.profile_credentials TO service_role;

ALTER TABLE public.profile_credentials ENABLE ROW LEVEL SECURITY;

-- Restrictive deny-all policy for non-service roles
CREATE POLICY "Deny all client access" ON public.profile_credentials
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 2) Migrate existing data
INSERT INTO public.profile_credentials (user_id, generated_password)
SELECT user_id, generated_password
FROM public.profiles
WHERE generated_password IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3) Drop column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS generated_password;

-- 4) Lock down lecture_completions writes (service role only)
CREATE POLICY "Deny client writes" ON public.lecture_completions
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Deny client updates" ON public.lecture_completions
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes" ON public.lecture_completions
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);

-- updated_at trigger
CREATE TRIGGER update_profile_credentials_updated_at
  BEFORE UPDATE ON public.profile_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
