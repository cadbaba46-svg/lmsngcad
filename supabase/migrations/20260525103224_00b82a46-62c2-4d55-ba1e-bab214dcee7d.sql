
CREATE TABLE public.mandatory_lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'youtube',
  duration_seconds integer NOT NULL DEFAULT 0,
  pass_threshold integer NOT NULL DEFAULT 7,
  course_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mandatory_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view active lectures"
ON public.mandatory_lectures FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage lectures"
ON public.mandatory_lectures FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_mandatory_lectures_updated_at
BEFORE UPDATE ON public.mandatory_lectures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.lecture_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lecture_id uuid NOT NULL REFERENCES public.mandatory_lectures(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  last_score integer,
  passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lecture_id)
);

ALTER TABLE public.lecture_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own completions"
ON public.lecture_completions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own completions"
ON public.lecture_completions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own completions"
ON public.lecture_completions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_lecture_completions_updated_at
BEFORE UPDATE ON public.lecture_completions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lecture_completions_user ON public.lecture_completions(user_id);
