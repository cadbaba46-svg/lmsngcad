CREATE TABLE public.result_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  session_label TEXT,
  assessments JSONB NOT NULL DEFAULT '[]'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_sheets TO authenticated;
GRANT ALL ON public.result_sheets TO service_role;
ALTER TABLE public.result_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their course result sheets"
ON public.result_sheets FOR ALL TO authenticated
USING (public.teacher_has_course_access(course_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.teacher_has_course_access(course_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view submitted result sheets"
ON public.result_sheets FOR SELECT TO authenticated
USING (status = 'submitted' AND public.user_has_active_enrollment_for_course(course_id, auth.uid()));

CREATE TABLE public.result_sheet_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  result_sheet_id UUID NOT NULL REFERENCES public.result_sheets(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  marks JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_obtained NUMERIC NOT NULL DEFAULT 0,
  weighted_score NUMERIC NOT NULL DEFAULT 0,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (result_sheet_id, enrollment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_sheet_marks TO authenticated;
GRANT ALL ON public.result_sheet_marks TO service_role;
ALTER TABLE public.result_sheet_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage marks for their sheets"
ON public.result_sheet_marks FOR ALL TO authenticated
USING (public.teacher_can_access_enrollment(enrollment_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.teacher_can_access_enrollment(enrollment_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view their own submitted marks"
ON public.result_sheet_marks FOR SELECT TO authenticated
USING (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.result_sheets rs
  WHERE rs.id = result_sheet_id AND rs.status = 'submitted'
));

CREATE TRIGGER update_result_sheets_updated_at BEFORE UPDATE ON public.result_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_result_sheet_marks_updated_at BEFORE UPDATE ON public.result_sheet_marks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();