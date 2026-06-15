CREATE TABLE IF NOT EXISTS public.lms_totp_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  secret text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.lms_totp_secrets TO service_role;

ALTER TABLE public.lms_totp_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all client access to lms_totp_secrets" ON public.lms_totp_secrets;
CREATE POLICY "Deny all client access to lms_totp_secrets"
  ON public.lms_totp_secrets AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS update_lms_totp_secrets_updated_at ON public.lms_totp_secrets;
CREATE TRIGGER update_lms_totp_secrets_updated_at
  BEFORE UPDATE ON public.lms_totp_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();