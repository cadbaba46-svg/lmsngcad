
CREATE TABLE public.challans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challan_number TEXT NOT NULL UNIQUE,
  customer_cnic TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PKR',
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_challans_cnic ON public.challans(customer_cnic);
CREATE INDEX idx_challans_status ON public.challans(status);

ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;

-- Students/users see only their own challans (matched via CNIC on profiles)
CREATE POLICY "Users can view own challans by CNIC"
ON public.challans FOR SELECT
TO authenticated
USING (
  customer_cnic IN (
    SELECT cnic FROM public.profiles
    WHERE user_id = auth.uid() AND cnic IS NOT NULL
  )
);

-- Admins manage everything
CREATE POLICY "Admins can manage challans"
ON public.challans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-generate challan number
CREATE OR REPLACE FUNCTION public.generate_challan_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.challan_number IS NULL OR NEW.challan_number = '' THEN
    NEW.challan_number := 'PF-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_challan_number
BEFORE INSERT ON public.challans
FOR EACH ROW
EXECUTE FUNCTION public.generate_challan_number();

CREATE TRIGGER update_challans_updated_at
BEFORE UPDATE ON public.challans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
