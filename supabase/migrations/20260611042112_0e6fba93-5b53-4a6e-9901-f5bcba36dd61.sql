
-- 1) Add user_id to challans, backfill from profiles by CNIC, and switch RLS to user_id ownership

ALTER TABLE public.challans ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.challans c
SET user_id = p.user_id
FROM public.profiles p
WHERE c.user_id IS NULL
  AND p.cnic IS NOT NULL
  AND p.cnic = c.customer_cnic;

CREATE INDEX IF NOT EXISTS idx_challans_user_id ON public.challans(user_id);

DROP POLICY IF EXISTS "Users can view own challans by CNIC" ON public.challans;
DROP POLICY IF EXISTS "Users can create own challans by CNIC" ON public.challans;

CREATE POLICY "Users can view own challans"
  ON public.challans
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own challans"
  ON public.challans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND customer_cnic IN (
      SELECT profiles.cnic FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.cnic IS NOT NULL
    )
  );

-- Ensure the course-fee challan trigger populates user_id
CREATE OR REPLACE FUNCTION public.create_course_fee_challan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_cnic text;
  v_name text;
  v_email text;
  v_phone text;
  v_price numeric;
  v_course_name text;
BEGIN
  SELECT cnic, full_name, email, phone INTO v_cnic, v_name, v_email, v_phone
  FROM public.profiles WHERE user_id = NEW.user_id;

  SELECT price, name INTO v_price, v_course_name
  FROM public.courses WHERE id = NEW.course_id;

  IF v_cnic IS NULL OR v_price IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.challans WHERE enrollment_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.challans (
    challan_number, user_id, customer_cnic, customer_name, customer_email, customer_phone,
    amount, description, status, issue_date, due_date, enrollment_id, course_id
  ) VALUES (
    '', NEW.user_id, v_cnic, v_name, v_email, v_phone,
    v_price, 'Course fee: ' || COALESCE(v_course_name, 'Course'), 'unpaid',
    CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days',
    NEW.id, NEW.course_id
  );

  RETURN NEW;
END;
$function$;

-- 2) Tighten enrollment self-insert: require course exists, is active, and matches caller
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;

CREATE POLICY "Users can insert own active-course enrollments"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.is_active = true
    )
  );

-- 3) Restrict mandatory_lectures SELECT to enrolled students of the lecture's course
DROP POLICY IF EXISTS "Anyone signed in can view active lectures" ON public.mandatory_lectures;

CREATE POLICY "Enrolled students can view course lectures"
  ON public.mandatory_lectures
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_active = true
      AND course_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.course_id = mandatory_lectures.course_id
          AND e.status = 'active'
      )
    )
    OR (
      is_active = true
      AND course_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.teacher_assignments ta
        WHERE ta.teacher_id = auth.uid()
          AND ta.course_id = mandatory_lectures.course_id
      )
    )
  );
