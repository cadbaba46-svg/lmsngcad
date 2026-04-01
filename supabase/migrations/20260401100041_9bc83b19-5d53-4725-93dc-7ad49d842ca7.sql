
-- Remove duplicate enrollments, keeping the latest per user
DELETE FROM public.enrollments
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.enrollments
  ORDER BY user_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_unique UNIQUE (user_id);
