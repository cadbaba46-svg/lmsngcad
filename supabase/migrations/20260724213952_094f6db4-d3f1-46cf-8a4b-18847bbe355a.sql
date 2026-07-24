REVOKE EXECUTE ON FUNCTION public.user_has_active_enrollment_for_course(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.teacher_has_course_access(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.teacher_can_access_enrollment(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.student_can_view_batch(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_has_active_enrollment_for_course(uuid, uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_has_course_access(uuid, uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_enrollment(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_can_view_batch(uuid, uuid) TO authenticated, service_role;