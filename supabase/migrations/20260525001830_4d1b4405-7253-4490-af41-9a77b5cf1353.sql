CREATE POLICY "Users can create own challans by CNIC"
ON public.challans
FOR INSERT
TO authenticated
WITH CHECK (
  customer_cnic IN (
    SELECT cnic FROM public.profiles
    WHERE user_id = auth.uid() AND cnic IS NOT NULL
  )
);