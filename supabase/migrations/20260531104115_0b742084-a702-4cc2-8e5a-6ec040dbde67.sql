
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_course_fee_challan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_enrollment_on_paid() FROM PUBLIC, anon, authenticated;
-- has_role must remain executable by authenticated/anon because it is invoked
-- from RLS policies which run with the caller's privileges.
