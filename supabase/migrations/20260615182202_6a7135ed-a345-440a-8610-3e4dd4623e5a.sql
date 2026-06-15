CREATE TABLE IF NOT EXISTS public.lms_totp_sessions (
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (user_id, session_id)
);

GRANT ALL ON public.lms_totp_sessions TO service_role;

ALTER TABLE public.lms_totp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all client access to lms_totp_sessions" ON public.lms_totp_sessions;
CREATE POLICY "Deny all client access to lms_totp_sessions"
  ON public.lms_totp_sessions AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);