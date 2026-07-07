
-- =========================================================================
-- Loyalty Program: types + tables
-- =========================================================================

CREATE TYPE public.loyalty_txn_type AS ENUM ('earn','redeem','adjust','expire','refund');
CREATE TYPE public.coupon_type AS ENUM ('percent','fixed','free_shipping');

-- ---------- loyalty_programs ----------
CREATE TABLE public.loyalty_programs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  points_per_currency   NUMERIC(10,4) NOT NULL DEFAULT 1,    -- points earned per 1 SAR spent
  currency_per_point    NUMERIC(10,4) NOT NULL DEFAULT 0.05, -- SAR value per 1 point on redeem
  min_redeem_points     INTEGER NOT NULL DEFAULT 100,
  expire_after_months   INTEGER,                              -- null = no expiry
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_programs TO authenticated;
GRANT ALL ON public.loyalty_programs TO service_role;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_programs read for members"
  ON public.loyalty_programs FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "loyalty_programs manage for admins"
  ON public.loyalty_programs FOR ALL TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

CREATE TRIGGER trg_loyalty_programs_updated
  BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- loyalty_transactions ----------
CREATE TABLE public.loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id       UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  type          public.loyalty_txn_type NOT NULL,
  points        INTEGER NOT NULL,          -- positive for earn/adjust+; negative for redeem/expire
  reason        TEXT,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_txn_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_txn_store    ON public.loyalty_transactions(store_id);
CREATE INDEX idx_loyalty_txn_sale     ON public.loyalty_transactions(sale_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_txn read for members"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "loyalty_txn insert for members"
  ON public.loyalty_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "loyalty_txn update for admins"
  ON public.loyalty_transactions FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

CREATE POLICY "loyalty_txn delete for admins"
  ON public.loyalty_transactions FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

-- ---------- coupons ----------
CREATE TABLE public.coupons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  description       TEXT,
  type              public.coupon_type NOT NULL DEFAULT 'percent',
  value             NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_discount      NUMERIC(12,2),
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  total_uses_limit  INTEGER,
  uses_count        INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons read for members"
  ON public.coupons FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "coupons manage for admins"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

-- allow cashiers to increment uses_count via update? handled server-side by redemption insert trigger
CREATE POLICY "coupons uses update for members"
  ON public.coupons FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id))
  WITH CHECK (public.is_store_member(store_id));

CREATE TRIGGER trg_coupons_updated
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- coupon_redemptions ----------
CREATE TABLE public.coupon_redemptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  coupon_id         UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id           UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  discount_applied  NUMERIC(12,2) NOT NULL DEFAULT 0,
  redeemed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_reversed       BOOLEAN NOT NULL DEFAULT false,
  reversed_at       TIMESTAMPTZ,
  redeemed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupon_red_coupon   ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_red_customer ON public.coupon_redemptions(customer_id);
CREATE INDEX idx_coupon_red_store    ON public.coupon_redemptions(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_red read for members"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "coupon_red insert for members"
  ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "coupon_red update for admins"
  ON public.coupon_redemptions FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

CREATE POLICY "coupon_red delete for admins"
  ON public.coupon_redemptions FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::store_role[]));

-- =========================================================================
-- Extend sales with loyalty/coupon fields
-- =========================================================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- =========================================================================
-- Helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_customer_points(_customer_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM public.loyalty_transactions
  WHERE customer_id = _customer_id
$$;

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _store_id UUID, _code TEXT, _customer_id UUID, _subtotal NUMERIC
) RETURNS TABLE(
  coupon_id UUID, discount NUMERIC, message TEXT, valid BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE c RECORD; d NUMERIC := 0; used_by_cust INTEGER;
BEGIN
  SELECT * INTO c FROM public.coupons
   WHERE store_id = _store_id AND code = _code AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, 'كوبون غير موجود أو غير مفعّل', false; RETURN;
  END IF;
  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN
    RETURN QUERY SELECT c.id, 0::NUMERIC, 'الكوبون لم يبدأ بعد', false; RETURN;
  END IF;
  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN
    RETURN QUERY SELECT c.id, 0::NUMERIC, 'الكوبون منتهي الصلاحية', false; RETURN;
  END IF;
  IF _subtotal < c.min_subtotal THEN
    RETURN QUERY SELECT c.id, 0::NUMERIC, 'قيمة الفاتورة أقل من الحد الأدنى', false; RETURN;
  END IF;
  IF c.total_uses_limit IS NOT NULL AND c.uses_count >= c.total_uses_limit THEN
    RETURN QUERY SELECT c.id, 0::NUMERIC, 'انتهى عدد استخدامات الكوبون', false; RETURN;
  END IF;
  IF c.per_customer_limit IS NOT NULL AND _customer_id IS NOT NULL THEN
    SELECT COUNT(*) INTO used_by_cust FROM public.coupon_redemptions
      WHERE coupon_id = c.id AND customer_id = _customer_id AND is_reversed = false;
    IF used_by_cust >= c.per_customer_limit THEN
      RETURN QUERY SELECT c.id, 0::NUMERIC, 'تجاوزت حد استخدامك لهذا الكوبون', false; RETURN;
    END IF;
  END IF;

  IF c.type = 'percent' THEN
    d := ROUND(_subtotal * c.value / 100, 2);
  ELSIF c.type = 'fixed' THEN
    d := LEAST(c.value, _subtotal);
  ELSE
    d := 0;
  END IF;
  IF c.max_discount IS NOT NULL THEN d := LEAST(d, c.max_discount); END IF;

  RETURN QUERY SELECT c.id, d, 'تم تطبيق الكوبون'::TEXT, true;
END $$;

-- =========================================================================
-- Trigger: keep customers.loyalty_points in sync
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sync_customer_loyalty_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid UUID;
BEGIN
  _cid := COALESCE(NEW.customer_id, OLD.customer_id);
  IF _cid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.customers
     SET loyalty_points = (SELECT COALESCE(SUM(points),0)::INTEGER
                             FROM public.loyalty_transactions WHERE customer_id = _cid)
   WHERE id = _cid;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_sync_customer_loyalty
AFTER INSERT OR UPDATE OR DELETE ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_loyalty_points();

-- =========================================================================
-- Trigger: increment coupon uses_count on redemption insert/reverse
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sync_coupon_uses()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = NEW.coupon_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.coupons SET uses_count = GREATEST(uses_count - 1, 0) WHERE id = OLD.coupon_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_reversed = false AND NEW.is_reversed = true THEN
      UPDATE public.coupons SET uses_count = GREATEST(uses_count - 1, 0) WHERE id = NEW.coupon_id;
    ELSIF OLD.is_reversed = true AND NEW.is_reversed = false THEN
      UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = NEW.coupon_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_sync_coupon_uses
AFTER INSERT OR UPDATE OR DELETE ON public.coupon_redemptions
FOR EACH ROW EXECUTE FUNCTION public.sync_coupon_uses();
