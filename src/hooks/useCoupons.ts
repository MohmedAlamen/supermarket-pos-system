import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export type CouponType = "percent" | "fixed" | "free_shipping";

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  total_uses_limit: number | null;
  uses_count: number;
  per_customer_limit: number | null;
  is_active: boolean;
  created_at: string;
}

export interface CouponRedemption {
  id: string;
  store_id: string;
  coupon_id: string;
  customer_id: string | null;
  sale_id: string | null;
  discount_applied: number;
  is_reversed: boolean;
  redeemed_at: string;
  coupons?: { code: string } | null;
  customers?: { name: string } | null;
}

export function useCoupons() {
  const { currentStore } = useStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentStore) { setCoupons([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("coupons").select("*").eq("store_id", currentStore.id).order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  }, [currentStore]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (c: Partial<Coupon> & { code: string }) => {
    if (!currentStore) return;
    const payload: any = { ...c, store_id: currentStore.id, code: c.code.trim().toUpperCase() };
    const { error } = c.id
      ? await (supabase as any).from("coupons").update(payload).eq("id", c.id)
      : await (supabase as any).from("coupons").insert(payload);
    if (error) { toast.error(error.message); return false; }
    toast.success("تم حفظ الكوبون");
    await load(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("coupons").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("تم الحذف"); await load(); return true;
  };

  const toggleActive = async (c: Coupon) => {
    await (supabase as any).from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    await load();
  };

  return { coupons, loading, upsert, remove, toggleActive, reload: load };
}

export function useCouponRedemptions() {
  const { currentStore } = useStore();
  const [items, setItems] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentStore) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("coupon_redemptions")
      .select("*, coupons(code), customers(name)")
      .eq("store_id", currentStore.id)
      .order("redeemed_at", { ascending: false })
      .limit(500);
    setItems(data || []); setLoading(false);
  }, [currentStore]);

  useEffect(() => { load(); }, [load]);

  const reverse = async (r: CouponRedemption) => {
    const { error } = await (supabase as any)
      .from("coupon_redemptions")
      .update({ is_reversed: true, reversed_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return false; }
    toast.success("تم إلغاء الاسترداد"); await load(); return true;
  };

  return { items, loading, reverse, reload: load };
}

export async function validateCoupon(
  storeId: string, code: string, customerId: string | null, subtotal: number
): Promise<{ coupon_id: string | null; discount: number; message: string; valid: boolean }> {
  const { data, error } = await (supabase as any).rpc("validate_coupon", {
    _store_id: storeId, _code: code.trim().toUpperCase(), _customer_id: customerId, _subtotal: subtotal,
  });
  if (error) return { coupon_id: null, discount: 0, message: error.message, valid: false };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    coupon_id: row?.coupon_id ?? null,
    discount: Number(row?.discount ?? 0),
    message: row?.message ?? "",
    valid: !!row?.valid,
  };
}
