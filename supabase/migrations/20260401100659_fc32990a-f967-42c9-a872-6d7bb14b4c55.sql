
-- Create teacher-course assignments table
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, course_id)
);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage teacher assignments" ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view own assignments" ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

-- Teachers can update enrollments for their courses (attendance)
CREATE POLICY "Teachers can update enrollments for their courses" ON public.enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_assignments
      WHERE teacher_assignments.teacher_id = auth.uid()
      AND teacher_assignments.course_id = enrollments.course_id
    )
  );

-- Teachers can view enrollments for their courses
CREATE POLICY "Teachers can view enrollments for their courses" ON public.enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_assignments
      WHERE teacher_assignments.teacher_id = auth.uid()
      AND teacher_assignments.course_id = enrollments.course_id
    )
  );

-- Teachers can view profiles of students in their courses
CREATE POLICY "Teachers can view student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      JOIN public.enrollments e ON e.course_id = ta.course_id
      WHERE ta.teacher_id = auth.uid()
      AND e.user_id = profiles.user_id
    )
  );
