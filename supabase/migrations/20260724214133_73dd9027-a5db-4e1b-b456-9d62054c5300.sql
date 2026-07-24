CREATE OR REPLACE FUNCTION public.get_student_timetable_options()
RETURNS TABLE(
  enrollment_id uuid,
  course_id uuid,
  course_name text,
  selected_teacher_id uuid,
  selected_section text,
  teacher_id uuid,
  teacher_name text,
  section text,
  slots jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH my_enrollments AS (
    SELECT e.id, e.course_id, e.selected_teacher_id, e.selected_section, c.name AS course_name
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = auth.uid()
      AND e.status IN ('active', 'pending')
  ), instructor_sources AS (
    SELECT DISTINCT me.id AS enrollment_id, me.course_id, me.course_name, me.selected_teacher_id, me.selected_section,
           tt.teacher_id, tt.section
    FROM my_enrollments me
    JOIN public.teacher_timetables tt ON tt.course_id = me.course_id

    UNION

    SELECT DISTINCT me.id AS enrollment_id, me.course_id, me.course_name, me.selected_teacher_id, me.selected_section,
           ta.teacher_id, ta.section
    FROM my_enrollments me
    JOIN public.teacher_assignments ta ON ta.course_id = me.course_id

    UNION

    SELECT DISTINCT me.id AS enrollment_id, me.course_id, me.course_name, me.selected_teacher_id, me.selected_section,
           b.teacher_id, b.section
    FROM my_enrollments me
    JOIN public.batches b ON b.course_id = me.course_id
    WHERE b.is_active = true
      AND b.teacher_id IS NOT NULL
  )
  SELECT src.enrollment_id,
         src.course_id,
         src.course_name,
         src.selected_teacher_id,
         src.selected_section,
         src.teacher_id,
         COALESCE(p.full_name, 'Instructor') AS teacher_name,
         src.section,
         COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id', tt.id,
               'day_of_week', tt.day_of_week,
               'start_time', tt.start_time,
               'end_time', tt.end_time,
               'room', tt.room
             ) ORDER BY tt.day_of_week, tt.start_time
           ) FILTER (WHERE tt.id IS NOT NULL),
           '[]'::jsonb
         ) AS slots
  FROM instructor_sources src
  LEFT JOIN public.teacher_timetables tt
    ON tt.course_id = src.course_id
   AND tt.teacher_id = src.teacher_id
   AND COALESCE(tt.section, '') = COALESCE(src.section, '')
  LEFT JOIN public.profiles p ON p.user_id = src.teacher_id
  GROUP BY src.enrollment_id, src.course_id, src.course_name, src.selected_teacher_id, src.selected_section,
           src.teacher_id, p.full_name, src.section
  ORDER BY src.course_name, COALESCE(p.full_name, 'Instructor'), src.section NULLS FIRST;
$$;

CREATE OR REPLACE FUNCTION public.choose_student_instructor(
  _enrollment_id uuid,
  _teacher_id uuid,
  _section text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_id uuid;
  v_section text;
BEGIN
  v_section := NULLIF(BTRIM(_section), '');

  SELECT e.course_id INTO v_course_id
  FROM public.enrollments e
  WHERE e.id = _enrollment_id
    AND e.user_id = auth.uid()
    AND e.status IN ('active', 'pending');

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Enrollment not found for this student';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_timetables tt
    WHERE tt.course_id = v_course_id
      AND tt.teacher_id = _teacher_id
      AND COALESCE(tt.section, '') = COALESCE(v_section, '')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.course_id = v_course_id
      AND ta.teacher_id = _teacher_id
      AND COALESCE(ta.section, '') = COALESCE(v_section, '')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.course_id = v_course_id
      AND b.teacher_id = _teacher_id
      AND b.is_active = true
      AND COALESCE(b.section, '') = COALESCE(v_section, '')
  ) THEN
    RAISE EXCEPTION 'Selected instructor is not available for this course';
  END IF;

  UPDATE public.enrollments
  SET selected_teacher_id = _teacher_id,
      selected_section = v_section,
      updated_at = now()
  WHERE id = _enrollment_id
    AND user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_timetable_options() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.choose_student_instructor(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_timetable_options() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.choose_student_instructor(uuid, uuid, text) TO authenticated, service_role;