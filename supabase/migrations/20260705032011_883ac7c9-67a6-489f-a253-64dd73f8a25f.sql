
-- =========================================================
-- Multi-tenant SaaS foundation: stores + store_members + store_id on tenant tables
-- =========================================================

-- 1) Stores table (a tenant = a store owned by a user)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 2) Per-store roles
DO $$ BEGIN
  CREATE TYPE public.store_role AS ENUM ('owner','admin','manager','cashier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Store members (which users belong to which store, with a role)
CREATE TABLE public.store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.store_role NOT NULL DEFAULT 'cashier',
  invited_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- 4) Security-definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_store_member(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(_store_id UUID, _roles public.store_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid() AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = auth.uid()
  )
$$;

-- 5) Trigger: when a store is created, insert an owner membership
CREATE OR REPLACE FUNCTION public.handle_new_store()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (store_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_handle_new_store ON public.stores;
CREATE TRIGGER trg_handle_new_store
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.handle_new_store();

DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) RLS on stores + store_members
CREATE POLICY "members can view their stores" ON public.stores
FOR SELECT TO authenticated USING (public.is_store_member(id));
CREATE POLICY "any authenticated can create a store they own" ON public.stores
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner can update store" ON public.stores
FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner can delete store" ON public.stores
FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members can view membership rows of their stores" ON public.store_members
FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "owner/admin can add members" ON public.store_members
FOR INSERT TO authenticated
WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));
CREATE POLICY "owner/admin can update members" ON public.store_members
FOR UPDATE TO authenticated
USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]))
WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));
CREATE POLICY "owner/admin can remove members" ON public.store_members
FOR DELETE TO authenticated
USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));

-- 7) Add store_id to tenant-scoped tables (nullable; app enforces on insert going forward)
ALTER TABLE public.branches       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.products       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.customers      ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers      ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.sales          ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.purchases      ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.branch_stock   ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS current_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_branches_store       ON public.branches(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store       ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store      ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_store      ON public.suppliers(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_store          ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_purchases_store      ON public.purchases(store_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_store   ON public.branch_stock(store_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_store ON public.store_settings(store_id);

-- 8) Rewrite RLS policies on tenant tables to scope by store membership.
--    (Existing policies are dropped and replaced; rows with NULL store_id become invisible
--    to non-service_role — intentional, since the user chose to start fresh.)
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['branches','products','customers','suppliers','sales','purchases','branch_stock','store_settings']
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Generic per-tenant policies
CREATE POLICY "tenant read"    ON public.branches       FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.branches       FOR INSERT TO authenticated WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant update"  ON public.branches       FOR UPDATE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[])) WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant delete"  ON public.branches       FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.products       FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.products       FOR INSERT TO authenticated WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant update"  ON public.products       FOR UPDATE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[])) WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant delete"  ON public.products       FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.customers      FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.customers      FOR INSERT TO authenticated WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "tenant update"  ON public.customers      FOR UPDATE TO authenticated USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "tenant delete"  ON public.customers      FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.suppliers      FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.suppliers      FOR INSERT TO authenticated WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant update"  ON public.suppliers      FOR UPDATE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[])) WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant delete"  ON public.suppliers      FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.sales          FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.sales          FOR INSERT TO authenticated WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "tenant update"  ON public.sales          FOR UPDATE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[])) WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant delete"  ON public.sales          FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.purchases      FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.purchases      FOR INSERT TO authenticated WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant update"  ON public.purchases      FOR UPDATE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[])) WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));
CREATE POLICY "tenant delete"  ON public.purchases      FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.branch_stock   FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.branch_stock   FOR INSERT TO authenticated WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "tenant update"  ON public.branch_stock   FOR UPDATE TO authenticated USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "tenant delete"  ON public.branch_stock   FOR DELETE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin','manager']::public.store_role[]));

CREATE POLICY "tenant read"    ON public.store_settings FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "tenant write"   ON public.store_settings FOR INSERT TO authenticated WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));
CREATE POLICY "tenant update"  ON public.store_settings FOR UPDATE TO authenticated USING (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[])) WITH CHECK (public.has_store_role(store_id, ARRAY['owner','admin']::public.store_role[]));
CREATE POLICY "tenant delete"  ON public.store_settings FOR DELETE TO authenticated USING (public.is_store_owner(store_id));
