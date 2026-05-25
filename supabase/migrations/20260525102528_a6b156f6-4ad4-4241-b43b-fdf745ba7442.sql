
CREATE TABLE public.admin_totp_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  secret text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own totp"
ON public.admin_totp_secrets FOR SELECT TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert own totp"
ON public.admin_totp_secrets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update own totp"
ON public.admin_totp_secrets FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete own totp"
ON public.admin_totp_secrets FOR DELETE TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_admin_totp_updated_at
BEFORE UPDATE ON public.admin_totp_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
