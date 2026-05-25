-- 1. Link challans to a course / enrollment so we can drive enrollment activation
ALTER TABLE public.challans
  ADD COLUMN IF NOT EXISTS enrollment_id uuid,
  ADD COLUMN IF NOT EXISTS course_id uuid;

CREATE INDEX IF NOT EXISTS idx_challans_enrollment_id ON public.challans(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_challans_course_id ON public.challans(course_id);

-- 2. When a student enrolls, auto-create a course-fee challan under their CNIC
CREATE OR REPLACE FUNCTION public.create_course_fee_challan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Need a CNIC so the student can see the challan via RLS
  IF v_cnic IS NULL OR v_price IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates if trigger fires twice for the same enrollment
  IF EXISTS (SELECT 1 FROM public.challans WHERE enrollment_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.challans (
    challan_number, customer_cnic, customer_name, customer_email, customer_phone,
    amount, description, status, issue_date, due_date, enrollment_id, course_id
  ) VALUES (
    '', v_cnic, v_name, v_email, v_phone,
    v_price, 'Course fee: ' || COALESCE(v_course_name, 'Course'), 'unpaid',
    CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days',
    NEW.id, NEW.course_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrollments_create_challan ON public.enrollments;
CREATE TRIGGER trg_enrollments_create_challan
AFTER INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.create_course_fee_challan();

-- 3. When a linked challan is marked paid, activate the enrollment
CREATE OR REPLACE FUNCTION public.activate_enrollment_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.enrollment_id IS NOT NULL THEN
    UPDATE public.enrollments
    SET status = 'active',
        challan_paid = true,
        challan_paid_at = COALESCE(NEW.paid_at, now()),
        updated_at = now()
    WHERE id = NEW.enrollment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challans_activate_enrollment ON public.challans;
CREATE TRIGGER trg_challans_activate_enrollment
AFTER UPDATE OF status ON public.challans
FOR EACH ROW EXECUTE FUNCTION public.activate_enrollment_on_paid();

-- Generate challan number if missing (already exists but ensure trigger attached)
DROP TRIGGER IF EXISTS trg_challans_number ON public.challans;
CREATE TRIGGER trg_challans_number
BEFORE INSERT ON public.challans
FOR EACH ROW EXECUTE FUNCTION public.generate_challan_number();