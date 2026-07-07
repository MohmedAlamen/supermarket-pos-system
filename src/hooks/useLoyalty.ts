import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export interface LoyaltyProgram {
  id: string;
  store_id: string;
  is_active: boolean;
  points_per_currency: number;
  currency_per_point: number;
  min_redeem_points: number;
  expire_after_months: number | null;
}

export interface LoyaltyTxn {
  id: string;
  store_id: string;
  customer_id: string;
  sale_id: string | null;
  type: "earn" | "redeem" | "adjust" | "expire" | "refund";
  points: number;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  customers?: { name: string } | null;
}

export function useLoyaltyProgram() {
  const { currentStore } = useStore();
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentStore) { setProgram(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("loyalty_programs")
      .select("*")
      .eq("store_id", currentStore.id)
      .maybeSingle();
    setProgram(data || null);
    setLoading(false);
  }, [currentStore]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<LoyaltyProgram>) => {
    if (!currentStore) return;
    const payload = { store_id: currentStore.id, ...patch };
    const { error } = program
      ? await (supabase as any).from("loyalty_programs").update(patch).eq("id", program.id)
      : await (supabase as any).from("loyalty_programs").insert(payload);
    if (error) { toast.error(error.message); return false; }
    toast.success("تم حفظ إعدادات الولاء");
    await load();
    return true;
  };

  return { program, loading, save, reload: load };
}

export function useLoyaltyTransactions() {
  const { currentStore } = useStore();
  const [txns, setTxns] = useState<LoyaltyTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentStore) { setTxns([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("loyalty_transactions")
      .select("*, customers(name)")
      .eq("store_id", currentStore.id)
      .order("created_at", { ascending: false })
      .limit(500);
    setTxns(data || []);
    setLoading(false);
  }, [currentStore]);

  useEffect(() => { load(); }, [load]);

  const reverse = async (txn: LoyaltyTxn) => {
    if (!currentStore) return;
    const { error } = await (supabase as any).from("loyalty_transactions").insert({
      store_id: currentStore.id,
      customer_id: txn.customer_id,
      sale_id: txn.sale_id,
      type: "refund",
      points: -txn.points,
      reason: `إلغاء حركة ${txn.id.slice(0, 8)}`,
    });
    if (error) { toast.error(error.message); return false; }
    toast.success("تم إلغاء الحركة");
    await load();
    return true;
  };

  return { txns, loading, reload: load, reverse };
}

export async function fetchCustomerPoints(customerId: string): Promise<number> {
  const { data } = await (supabase as any).rpc("get_customer_points", { _customer_id: customerId });
  return Number(data ?? 0);
}
