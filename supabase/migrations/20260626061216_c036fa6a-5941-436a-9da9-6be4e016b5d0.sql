
-- 1) Add batch_id to enrollments FIRST so later policies can reference it
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS batch_id uuid;

-- 2) Create batches table
CREATE TABLE IF NOT EXISTS public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_code text,
  name text NOT NULL,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, name)
);
GRANT SELECT ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage batches"
ON public.batches FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Teachers view their batches"
ON public.batches FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Students view their batch"
ON public.batches FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid() AND e.batch_id = batches.id));

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Add FK on enrollments.batch_id now that batches exists
ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_batch_id_fkey,
  ADD CONSTRAINT enrollments_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;

-- 4) Auto-link teacher_assignments when enrollment given a batch
CREATE OR REPLACE FUNCTION public.link_teacher_on_batch_assignment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_teacher uuid; v_course uuid;
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    SELECT teacher_id, course_id INTO v_teacher, v_course FROM public.batches WHERE id = NEW.batch_id;
    IF v_teacher IS NOT NULL AND v_course IS NOT NULL THEN
      INSERT INTO public.teacher_assignments (teacher_id, course_id)
      VALUES (v_teacher, v_course) ON CONFLICT DO NOTHING;
      NEW.course_id := v_course;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrollments_link_teacher ON public.enrollments;
CREATE TRIGGER trg_enrollments_link_teacher
  BEFORE INSERT OR UPDATE OF batch_id ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.link_teacher_on_batch_assignment();

DROP POLICY IF EXISTS "Teachers can view enrollments via batch" ON public.enrollments;
CREATE POLICY "Teachers can view enrollments via batch"
ON public.enrollments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = enrollments.batch_id AND b.teacher_id = auth.uid()));

-- 5) Course evaluations: add report fields + set canonical totals
ALTER TABLE public.course_evaluations
  ADD COLUMN IF NOT EXISTS report_marks numeric,
  ADD COLUMN IF NOT EXISTS report_total numeric;

UPDATE public.course_evaluations SET
  mid_total    = COALESCE(mid_total, 20),
  final_total  = COALESCE(final_total, 30),
  oel_total    = COALESCE(oel_total, 20),
  cep_total    = COALESCE(cep_total, 20),
  report_total = COALESCE(report_total, 10);

-- 6) Survey submission cache + trigger
ALTER TABLE public.survey_submissions
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS course_code text,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_name text,
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS teacher_name text;

CREATE OR REPLACE FUNCTION public.enrich_survey_submission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_enr record; v_batch record; v_profile record; v_course record; v_teacher_name text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = NEW.student_id;
  SELECT * INTO v_course  FROM public.courses  WHERE id = NEW.course_id;
  SELECT * INTO v_enr     FROM public.enrollments WHERE user_id = NEW.student_id AND course_id = NEW.course_id LIMIT 1;
  IF v_enr.batch_id IS NOT NULL THEN
    SELECT * INTO v_batch FROM public.batches WHERE id = v_enr.batch_id;
    SELECT full_name INTO v_teacher_name FROM public.profiles WHERE user_id = v_batch.teacher_id;
    NEW.batch_id    := v_batch.id;
    NEW.batch_name  := v_batch.name;
    NEW.teacher_id  := v_batch.teacher_id;
    NEW.teacher_name:= v_teacher_name;
  END IF;
  NEW.student_name := COALESCE(NEW.student_name, v_profile.full_name);
  NEW.roll_number  := COALESCE(NEW.roll_number,  v_profile.roll_number);
  NEW.course_name  := COALESCE(NEW.course_name,  v_course.name);
  NEW.course_code  := COALESCE(NEW.course_code,  v_course.short_code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrich_survey_submission ON public.survey_submissions;
CREATE TRIGGER trg_enrich_survey_submission
  BEFORE INSERT ON public.survey_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enrich_survey_submission();

UPDATE public.survey_submissions s SET
  student_name = COALESCE(s.student_name, p.full_name),
  roll_number  = COALESCE(s.roll_number,  p.roll_number),
  course_name  = COALESCE(s.course_name,  c.name),
  course_code  = COALESCE(s.course_code,  c.short_code)
FROM public.profiles p, public.courses c
WHERE p.user_id = s.student_id AND c.id = s.course_id;

DROP POLICY IF EXISTS "Admins view all submissions" ON public.survey_submissions;
CREATE POLICY "Admins view all submissions"
ON public.survey_submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR student_id = auth.uid());
