ALTER TABLE public.teacher_assignments ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE public.teacher_assignments DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_course_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS teacher_assignments_tcs_key
  ON public.teacher_assignments(teacher_id, course_id, COALESCE(section, ''));

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS selected_teacher_id uuid;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS selected_section text;

CREATE TABLE IF NOT EXISTS public.teacher_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section text,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teacher_timetables TO authenticated;
GRANT ALL ON public.teacher_timetables TO service_role;
ALTER TABLE public.teacher_timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage timetables" ON public.teacher_timetables;
CREATE POLICY "Admins manage timetables" ON public.teacher_timetables
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Authenticated view timetables" ON public.teacher_timetables;
CREATE POLICY "Authenticated view timetables" ON public.teacher_timetables
  FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS trg_teacher_timetables_uat ON public.teacher_timetables;
CREATE TRIGGER trg_teacher_timetables_uat BEFORE UPDATE ON public.teacher_timetables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();