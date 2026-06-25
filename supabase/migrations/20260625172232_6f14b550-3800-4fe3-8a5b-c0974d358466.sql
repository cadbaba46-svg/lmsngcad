
-- Student <-> teacher chat
CREATE TABLE public.student_teacher_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stm_thread ON public.student_teacher_messages (course_id, student_id, teacher_id, created_at);

GRANT SELECT, INSERT ON public.student_teacher_messages TO authenticated;
GRANT ALL ON public.student_teacher_messages TO service_role;

ALTER TABLE public.student_teacher_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admin can read messages"
ON public.student_teacher_messages FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR auth.uid() = teacher_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Participants can post messages"
ON public.student_teacher_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (auth.uid() = student_id OR auth.uid() = teacher_id)
  AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.course_id = student_teacher_messages.course_id
      AND ta.teacher_id = student_teacher_messages.teacher_id
  )
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = student_teacher_messages.course_id
      AND e.user_id = student_teacher_messages.student_id
  )
);

-- Course evaluations (DMC course track)
CREATE TABLE public.course_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
  mid_marks numeric,
  mid_total numeric,
  final_marks numeric,
  final_total numeric,
  oel_marks numeric,
  oel_total numeric,
  cep_marks numeric,
  cep_total numeric,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_evaluations TO authenticated;
GRANT ALL ON public.course_evaluations TO service_role;

ALTER TABLE public.course_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own evaluations"
ON public.course_evaluations FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.teacher_assignments ta ON ta.course_id = e.course_id
    WHERE e.id = enrollment_id AND ta.teacher_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Teachers manage evaluations for their courses"
ON public.course_evaluations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.teacher_assignments ta ON ta.course_id = e.course_id
    WHERE e.id = enrollment_id AND ta.teacher_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.teacher_assignments ta ON ta.course_id = e.course_id
    WHERE e.id = enrollment_id AND ta.teacher_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_course_evaluations_updated_at
BEFORE UPDATE ON public.course_evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
