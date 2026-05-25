REVOKE EXECUTE ON FUNCTION public.create_course_fee_challan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_enrollment_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_challan_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;