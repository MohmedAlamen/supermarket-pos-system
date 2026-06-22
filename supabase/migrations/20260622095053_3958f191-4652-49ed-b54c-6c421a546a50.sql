
-- 1) BRANCHES
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_counter INTEGER NOT NULL DEFAULT 1000,
  address TEXT,
  phone TEXT,
  tax_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_auth" ON public.branches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_admin_insert" ON public.branches
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branches_admin_update" ON public.branches
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branches_admin_delete" ON public.branches
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) BRANCH STOCK (per-branch inventory)
CREATE TABLE public.branch_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_stock TO authenticated;
GRANT ALL ON public.branch_stock TO service_role;
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_stock_select_auth" ON public.branch_stock
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "branch_stock_insert_auth" ON public.branch_stock
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "branch_stock_update_auth" ON public.branch_stock
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "branch_stock_admin_delete" ON public.branch_stock
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_branch_stock_updated_at
  BEFORE UPDATE ON public.branch_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_branch_stock_branch ON public.branch_stock(branch_id);
CREATE INDEX idx_branch_stock_product ON public.branch_stock(product_id);

-- 3) Add branch_id to sales & purchases
ALTER TABLE public.sales ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.purchases ADD COLUMN branch_id UUID REFERENCES public.branches(id);
CREATE INDEX idx_sales_branch ON public.sales(branch_id);
CREATE INDEX idx_purchases_branch ON public.purchases(branch_id);

-- 4) profiles default branch
ALTER TABLE public.profiles ADD COLUMN default_branch_id UUID REFERENCES public.branches(id);

-- 5) Seed default branch
INSERT INTO public.branches (name, code, invoice_prefix)
VALUES ('الفرع الرئيسي', 'MAIN', 'INV');

-- 6) Migrate existing product stock to default branch
INSERT INTO public.branch_stock (branch_id, product_id, stock)
SELECT (SELECT id FROM public.branches WHERE code='MAIN'), p.id, p.stock
FROM public.products p;

-- 7) Backfill branch_id on existing sales/purchases
UPDATE public.sales SET branch_id = (SELECT id FROM public.branches WHERE code='MAIN') WHERE branch_id IS NULL;
UPDATE public.purchases SET branch_id = (SELECT id FROM public.branches WHERE code='MAIN') WHERE branch_id IS NULL;

-- 8) Per-branch invoice number function
CREATE OR REPLACE FUNCTION public.generate_branch_invoice_number(_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  UPDATE public.branches
    SET invoice_counter = invoice_counter + 1
    WHERE id = _branch_id
    RETURNING invoice_counter, invoice_prefix INTO next_num, prefix;

  IF next_num IS NULL THEN
    RAISE EXCEPTION 'Branch % not found', _branch_id;
  END IF;

  RETURN prefix || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;
