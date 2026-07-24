CREATE OR REPLACE FUNCTION public.user_has_active_enrollment_for_course(
  _user_id uuid,
  _course_id uuid,
  _course_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.user_id = _user_id
      AND e.status = 'active'
      AND (
        e.course_id = _course_id
        OR e.course_id = ANY(COALESCE(_course_ids, '{}'::uuid[]))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_course_access(
  _teacher_id uuid,
  _course_id uuid,
  _course_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    WHERE ta.teacher_id = _teacher_id
      AND (
        ta.course_id = _course_id
        OR ta.course_id = ANY(COALESCE(_course_ids, '{}'::uuid[]))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.batches b
    WHERE b.teacher_id = _teacher_id
      AND b.is_active = true
      AND (
        b.course_id = _course_id
        OR b.course_id = ANY(COALESCE(_course_ids, '{}'::uuid[]))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_access_enrollment(
  _teacher_id uuid,
  _enrollment_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.teacher_assignments ta
      ON ta.course_id = e.course_id
     AND ta.teacher_id = _teacher_id
    WHERE e.id = _enrollment_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.batches b
      ON b.id = e.batch_id
     AND b.teacher_id = _teacher_id
    WHERE e.id = _enrollment_id
  );
$$;

CREATE OR REPLACE FUNCTION public.student_can_view_batch(
  _student_id uuid,
  _batch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.user_id = _student_id
      AND e.batch_id = _batch_id
  );
$$;

DROP POLICY IF EXISTS "Students view their batch" ON public.batches;
CREATE POLICY "Students view their batch"
ON public.batches
FOR SELECT
TO authenticated
USING (public.student_can_view_batch(auth.uid(), id));

DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can update enrollments for their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments via batch" ON public.enrollments;

CREATE POLICY "Teachers can view enrollments they teach"
ON public.enrollments
FOR SELECT
TO authenticated
USING (public.teacher_can_access_enrollment(auth.uid(), id));

CREATE POLICY "Teachers can update enrollments they teach"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (public.teacher_can_access_enrollment(auth.uid(), id));

DROP POLICY IF EXISTS "Enrolled students can view course lectures" ON public.mandatory_lectures;
CREATE POLICY "Authorized users can view course lectures"
ON public.mandatory_lectures
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_active = true
    AND public.user_has_active_enrollment_for_course(auth.uid(), course_id, course_ids)
  )
  OR (
    is_active = true
    AND public.teacher_has_course_access(auth.uid(), course_id, course_ids)
  )
);

GRANT EXECUTE ON FUNCTION public.user_has_active_enrollment_for_course(uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_has_course_access(uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_enrollment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_view_batch(uuid, uuid) TO authenticated;