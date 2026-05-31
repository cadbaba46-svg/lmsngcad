
-- 1) Remove teacher-broad SELECT on profiles (was exposing generated_password). Replace with a safe RPC.
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_teacher_students(_course_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, roll_number text, department text, semester text, course_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.user_id, p.full_name, p.roll_number, p.department, p.semester, e.course_id
  FROM public.profiles p
  JOIN public.enrollments e ON e.user_id = p.user_id
  JOIN public.teacher_assignments ta ON ta.course_id = e.course_id
  WHERE ta.teacher_id = auth.uid()
    AND ta.course_id = ANY(_course_ids);
$$;
REVOKE EXECUTE ON FUNCTION public.get_teacher_students(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_students(uuid[]) TO authenticated;

-- 2) Quiz sessions store correct answers server-side; no client access
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  questions jsonb NOT NULL,
  pass_threshold integer NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access to quiz_sessions"
  ON public.quiz_sessions AS RESTRICTIVE FOR ALL
  TO anon, authenticated USING (false) WITH CHECK (false);

-- 3) Lock down lecture_completions writes - force submission via edge function (service role)
DROP POLICY IF EXISTS "Users insert own completions" ON public.lecture_completions;
DROP POLICY IF EXISTS "Users update own completions" ON public.lecture_completions;
-- SELECT policy "Users view own completions" remains so the client can read pass status.

-- 4) Lock down admin_totp_secrets - clients must use edge functions for setup/validate
DROP POLICY IF EXISTS "Admin can view own totp" ON public.admin_totp_secrets;
DROP POLICY IF EXISTS "Admin can insert own totp" ON public.admin_totp_secrets;
DROP POLICY IF EXISTS "Admin can update own totp" ON public.admin_totp_secrets;
DROP POLICY IF EXISTS "Admin can delete own totp" ON public.admin_totp_secrets;
REVOKE ALL ON public.admin_totp_secrets FROM authenticated, anon;
GRANT ALL ON public.admin_totp_secrets TO service_role;
CREATE POLICY "Deny all client access to admin_totp_secrets"
  ON public.admin_totp_secrets AS RESTRICTIVE FOR ALL
  TO anon, authenticated USING (false) WITH CHECK (false);
