CREATE TABLE IF NOT EXISTS public.course_content_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content_key text NOT NULL,
  content_title text NOT NULL,
  selected_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, content_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_content_selections TO authenticated;
GRANT ALL ON public.course_content_selections TO service_role;

ALTER TABLE public.course_content_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own course content selections" ON public.course_content_selections;
CREATE POLICY "Students manage own course content selections"
ON public.course_content_selections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = course_content_selections.enrollment_id
      AND e.user_id = auth.uid()
      AND e.course_id = course_content_selections.course_id
  )
);

DROP POLICY IF EXISTS "Admins manage all course content selections" ON public.course_content_selections;
CREATE POLICY "Admins manage all course content selections"
ON public.course_content_selections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.can_student_teacher_message(
  _student_id uuid,
  _teacher_id uuid,
  _course_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.user_id = _student_id
      AND e.course_id = _course_id
      AND e.challan_paid = true
      AND (
        e.selected_teacher_id = _teacher_id
        OR EXISTS (
          SELECT 1
          FROM public.teacher_assignments ta
          WHERE ta.course_id = _course_id
            AND ta.teacher_id = _teacher_id
            AND (ta.section IS NULL OR ta.section = e.selected_section)
        )
        OR EXISTS (
          SELECT 1
          FROM public.batches b
          WHERE b.id = e.batch_id
            AND b.teacher_id = _teacher_id
        )
      )
  )
$$;

DROP POLICY IF EXISTS "Participants can post messages" ON public.student_teacher_messages;
CREATE POLICY "Participants can post messages"
ON public.student_teacher_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (auth.uid() = student_id OR auth.uid() = teacher_id)
  AND public.can_student_teacher_message(student_id, teacher_id, course_id)
);

DROP POLICY IF EXISTS "Participants and admin can read messages" ON public.student_teacher_messages;
CREATE POLICY "Participants and admin can read messages"
ON public.student_teacher_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    (auth.uid() = student_id OR auth.uid() = teacher_id)
    AND public.can_student_teacher_message(student_id, teacher_id, course_id)
  )
);

GRANT SELECT, INSERT ON public.student_teacher_messages TO authenticated;
GRANT ALL ON public.student_teacher_messages TO service_role;