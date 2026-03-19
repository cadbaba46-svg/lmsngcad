
-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  total_weeks integer NOT NULL DEFAULT 12,
  course_content jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enrollments table
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked', 'completed')),
  challan_paid boolean NOT NULL DEFAULT false,
  challan_generated_at timestamptz,
  challan_paid_at timestamptz,
  attendance jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Courses: everyone can read active courses
CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin can manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enrollments: users see own, admin sees all
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can manage all enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial courses
INSERT INTO public.courses (name, price, description, total_weeks, course_content) VALUES
('Auto CAD With 3D', 10000, 'Master the industry-standard software for professional engineering drafting and design. Learn to create precise 2D blueprints and transform them into detailed 3D mechanical models.', 12, '["Advanced 2D Geometric Construction & Layer Management", "Mechanical Drafting Standards and ISO/ANSI Documentation", "3D Part Modeling, Surface Modeling & Rendering", "Professional Plotting and Technical Drawing Generation"]'::jsonb),
('SOLIDWORKS', 15000, 'The ultimate course for parametric 3D design used by top manufacturing firms. Focus on building complex parts, large assemblies, and production-ready engineering drawings.', 12, '["Parametric Part Modeling & Sketching Techniques", "Complex Assembly Design and Interference Detection", "Sheet Metal Design and Weldment Structural Analysis", "Creating Bill of Materials (BOM) and Exploded Views"]'::jsonb),
('PTC CREO PARAMETRIC', 15000, 'A high-end course designed for the Automotive and Aerospace Industries. Learn the robust modeling capabilities of Creo to handle heavy-duty mechanical engineering projects.', 12, '["Advanced Feature-Based Parametric Design", "Core & Cavity Design for Injection Molding", "Top-Down Assembly Design for Complex Systems", "Mechanism Simulation and Kinematic Analysis"]'::jsonb),
('Powershape+Powermill', 25000, 'The complete CAD/CAM solution for the Tool & Die Industry. Learn to design complex molds in PowerShape and generate high-efficiency CNC toolpaths in PowerMill.', 16, '["Hybrid Modeling for Complex Mold & Die Surfaces", "Advanced 3-Axis & 5-Axis CNC Toolpath Generation", "Stock Model Management and Collision Avoidance", "Post-Processing for VMC Machines and G-Code Generation"]'::jsonb);
