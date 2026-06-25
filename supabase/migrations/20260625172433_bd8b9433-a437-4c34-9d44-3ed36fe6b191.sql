
CREATE OR REPLACE FUNCTION public.get_public_teacher_profiles(_teacher_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.user_id AND ur.role = 'teacher'::app_role
  WHERE p.user_id = ANY(_teacher_ids);
$$;

REVOKE ALL ON FUNCTION public.get_public_teacher_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_teacher_profiles(uuid[]) TO authenticated, service_role;
