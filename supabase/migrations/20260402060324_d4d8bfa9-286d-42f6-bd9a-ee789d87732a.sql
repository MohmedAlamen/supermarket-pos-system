
DROP POLICY "Authenticated users can insert sales" ON public.sales;
CREATE POLICY "Users can insert own sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = cashier_id);
