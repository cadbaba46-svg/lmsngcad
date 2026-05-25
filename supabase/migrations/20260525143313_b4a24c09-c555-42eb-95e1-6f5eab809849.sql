
CREATE TABLE public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps(email);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (edge functions) may access
