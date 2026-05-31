
-- 1) Pin search_path on remaining functions that lacked it
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;

-- 2) Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER helpers
--    has_role MUST remain executable (used inside RLS policies).
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

-- 3) password_reset_otps: RLS is enabled with no policies => already inaccessible
--    to anon/authenticated. Add an explicit deny policy to make the intent clear,
--    and ensure no role-level grants exist beyond service_role.
REVOKE ALL ON TABLE public.password_reset_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.password_reset_otps TO service_role;

CREATE POLICY "Deny all client access to password_reset_otps"
ON public.password_reset_otps
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
