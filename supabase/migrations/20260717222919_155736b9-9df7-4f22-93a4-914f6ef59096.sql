
-- Extend mandatory_lectures with multi-course targeting, quiz optionality, and watch-percent requirement
ALTER TABLE public.mandatory_lectures
  ADD COLUMN IF NOT EXISTS course_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_quiz_mandatory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS watch_percentage_required integer NOT NULL DEFAULT 80;

-- Backfill course_ids from legacy single course_id
UPDATE public.mandatory_lectures
   SET course_ids = ARRAY[course_id]
 WHERE course_id IS NOT NULL AND (course_ids IS NULL OR array_length(course_ids,1) IS NULL);

-- Replace SELECT policy to check membership in course_ids (or legacy course_id)
DROP POLICY IF EXISTS "Enrolled students can view course lectures" ON public.mandatory_lectures;

CREATE POLICY "Enrolled students can view course lectures"
  ON public.mandatory_lectures
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.status = 'active'
          AND (
            e.course_id = mandatory_lectures.course_id
            OR e.course_id = ANY(mandatory_lectures.course_ids)
          )
      )
    )
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.teacher_assignments ta
        WHERE ta.teacher_id = auth.uid()
          AND (
            ta.course_id = mandatory_lectures.course_id
            OR ta.course_id = ANY(mandatory_lectures.course_ids)
          )
      )
    )
  );

-- Batches: add A-Z section letter
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS section text;
