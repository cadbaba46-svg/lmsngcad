REVOKE EXECUTE ON FUNCTION public.user_has_active_enrollment_for_course(uuid, uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_has_course_access(uuid, uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_can_access_enrollment(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.student_can_view_batch(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_student_timetable_options() FROM anon;
REVOKE EXECUTE ON FUNCTION public.choose_student_instructor(uuid, uuid, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.user_has_active_enrollment_for_course(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.teacher_has_course_access(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.teacher_can_access_enrollment(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.student_can_view_batch(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_timetable_options() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.choose_student_instructor(uuid, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_has_active_enrollment_for_course(uuid, uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_has_course_access(uuid, uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_enrollment(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_can_view_batch(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_timetable_options() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.choose_student_instructor(uuid, uuid, text) TO authenticated, service_role;