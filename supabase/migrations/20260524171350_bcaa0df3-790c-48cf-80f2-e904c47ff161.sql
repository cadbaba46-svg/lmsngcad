
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Course and Faculty Evaluation Survey',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id)
);

CREATE TABLE public.survey_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (survey_id, student_id)
);

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.survey_submissions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_submissions_student ON public.survey_submissions(student_id);
CREATE INDEX idx_submissions_course ON public.survey_submissions(course_id);
CREATE INDEX idx_responses_submission ON public.survey_responses(submission_id);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Surveys
CREATE POLICY "Anyone signed in can view active surveys"
ON public.surveys FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage surveys"
ON public.surveys FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Submissions
CREATE POLICY "Students view own submissions"
ON public.survey_submissions FOR SELECT TO authenticated
USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students create own submissions"
ON public.survey_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins manage submissions"
ON public.survey_submissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Responses
CREATE POLICY "View own responses"
ON public.survey_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.survey_submissions s
    WHERE s.id = submission_id
      AND (s.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Insert own responses"
ON public.survey_responses FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.survey_submissions s
    WHERE s.id = submission_id AND s.student_id = auth.uid()
  )
);

CREATE TRIGGER update_surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
