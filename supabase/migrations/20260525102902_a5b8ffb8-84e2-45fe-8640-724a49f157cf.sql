
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own complaints"
ON public.complaints FOR SELECT TO authenticated
USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students create own complaints"
ON public.complaints FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins manage complaints"
ON public.complaints FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete complaints"
ON public.complaints FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_complaints_student ON public.complaints(student_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
