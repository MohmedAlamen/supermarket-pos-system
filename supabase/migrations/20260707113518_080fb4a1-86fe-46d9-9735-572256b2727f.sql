
CREATE TYPE public.payment_status AS ENUM ('pending','approved','failed','refunded','voided');

CREATE TABLE public.payment_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sale_id       UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  method        TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference     TEXT NOT NULL,
  gateway_ref   TEXT,
  gateway       TEXT NOT NULL DEFAULT 'manual',
  status        public.payment_status NOT NULL DEFAULT 'approved',
  raw_response  JSONB,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_txn_sale  ON public.payment_transactions(sale_id);
CREATE INDEX idx_payment_txn_store ON public.payment_transactions(store_id);
CREATE INDEX idx_payment_txn_ref   ON public.payment_transactions(reference);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_txn read for members"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "payment_txn insert for members"
  ON public.payment_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "payment_txn update for admins"
  ON public.payment_transactions FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

CREATE POLICY "payment_txn delete for admins"
  ON public.payment_transactions FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

CREATE TRIGGER trg_payment_txn_updated
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
