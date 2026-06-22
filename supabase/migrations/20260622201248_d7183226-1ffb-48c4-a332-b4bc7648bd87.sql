
-- New columns
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS course_roll_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualification_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualification_field text;

-- Generator: next student registration number (YYMM-NGCAD-0001, monthly reset)
CREATE OR REPLACE FUNCTION public.next_registration_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  next_seq int;
BEGIN
  prefix := to_char(now(), 'YYMM') || '-NGCAD-';
  SELECT COALESCE(MAX((regexp_replace(roll_number, '^' || prefix, ''))::int), 0) + 1
    INTO next_seq
    FROM public.profiles
   WHERE roll_number ~ ('^' || prefix || '[0-9]+$');
  RETURN prefix || lpad(next_seq::text, 4, '0');
END;
$$;

-- Generator: next per-course roll number (YYMM-<CODE>-0001, monthly reset)
CREATE OR REPLACE FUNCTION public.next_course_roll_number(_course_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  prefix text;
  next_seq int;
BEGIN
  SELECT NULLIF(upper(trim(short_code)), '') INTO code FROM public.courses WHERE id = _course_id;
  IF code IS NULL THEN code := 'GEN'; END IF;
  prefix := to_char(now(), 'YYMM') || '-' || code || '-';
  SELECT COALESCE(MAX((regexp_replace(course_roll_number, '^' || prefix, ''))::int), 0) + 1
    INTO next_seq
    FROM public.enrollments
   WHERE course_roll_number ~ ('^' || prefix || '[0-9]+$');
  RETURN prefix || lpad(next_seq::text, 4, '0');
END;
$$;

-- Auto-assign course_roll_number when an enrollment is inserted
CREATE OR REPLACE FUNCTION public.assign_course_roll_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.course_roll_number IS NULL OR NEW.course_roll_number = '' THEN
    NEW.course_roll_number := public.next_course_roll_number(NEW.course_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrollments_assign_course_roll ON public.enrollments;
CREATE TRIGGER trg_enrollments_assign_course_roll
  BEFORE INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_course_roll_number();

-- Login lookup: ignore case and dashes/spaces in the supplied identifier
CREATE OR REPLACE FUNCTION public.find_user_id_by_login(_identifier text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
    FROM public.profiles
   WHERE upper(regexp_replace(coalesce(roll_number, ''), '[-\s]', '', 'g'))
       = upper(regexp_replace(coalesce(_identifier, ''),  '[-\s]', '', 'g'))
     AND roll_number IS NOT NULL
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.next_registration_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_course_roll_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_login(text) TO anon, authenticated, service_role;
