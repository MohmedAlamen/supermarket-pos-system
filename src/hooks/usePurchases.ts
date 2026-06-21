import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PurchaseItem {
  product_id: string;
  name: string;
  cost: number;
  quantity: number;
}

export interface Purchase {
  id: string;
  created_at: string;
  invoice_number: string | null;
  supplier_id: string | null;
  items: PurchaseItem[];
  total: number;
  paid: number;
  payment_method: string;
  notes: string | null;
}

export function usePurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("purchases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("خطأ في تحميل المشتريات");
    } else {
      setPurchases((data || []).map((p: any) => ({ ...p, items: p.items as PurchaseItem[] })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addPurchase = async (data: {
    supplier_id: string | null;
    items: PurchaseItem[];
    paid: number;
    payment_method: string;
    notes?: string;
  }) => {
    const total = data.items.reduce((s, it) => s + it.cost * it.quantity, 0);
    const invoice_number = `PUR-${Date.now().toString().slice(-8)}`;

    const { error } = await (supabase as any).from("purchases").insert({
      created_by: user?.id || null,
      supplier_id: data.supplier_id,
      invoice_number,
      items: data.items,
      total,
      paid: data.paid,
      payment_method: data.payment_method,
      notes: data.notes || null,
    });
    if (error) {
      toast.error("خطأ في حفظ فاتورة الشراء");
      console.error(error);
      return false;
    }

    // Update product stock and cost_price
    for (const it of data.items) {
      const { data: prod } = await (supabase as any)
        .from("products").select("stock").eq("id", it.product_id).maybeSingle();
      if (prod) {
        await (supabase as any).from("products").update({
          stock: (prod.stock || 0) + it.quantity,
          cost_price: it.cost,
        }).eq("id", it.product_id);
      }
    }

    // Update supplier balance (amount owed = total - paid added to balance)
    if (data.supplier_id) {
      const owed = total - data.paid;
      if (owed !== 0) {
        const { data: sup } = await (supabase as any)
          .from("suppliers").select("balance").eq("id", data.supplier_id).maybeSingle();
        if (sup) {
          await (supabase as any).from("suppliers")
            .update({ balance: Number(sup.balance || 0) + owed })
            .eq("id", data.supplier_id);
        }
      }
    }

    toast.success(`تم حفظ فاتورة الشراء ${invoice_number}`);
    await fetch();
    return true;
  };

  return { purchases, loading, addPurchase, fetch };
}
