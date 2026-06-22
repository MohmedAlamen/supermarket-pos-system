import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { CartItem } from "@/types/pos";
import { toast } from "sonner";

export function useSales() {
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const saveSale = async (sale: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    discountAmount: number;
    tax_amount?: number;
    total: number;
    paymentMethod: "cash" | "card";
    cashReceived?: number;
    change?: number;
    customer_id?: string | null;
  }): Promise<{ ok: boolean; invoice_number?: string }> => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return { ok: false }; }
    if (!currentBranch) { toast.error("يجب اختيار الفرع أولاً"); return { ok: false }; }

    // Per-branch sequential invoice number
    const { data: invData, error: invErr } = await (supabase as any)
      .rpc("generate_branch_invoice_number", { _branch_id: currentBranch.id });
    if (invErr) {
      console.error(invErr);
      toast.error("خطأ في توليد رقم الفاتورة");
      return { ok: false };
    }
    const invoice_number = invData || `INV-${Date.now()}`;

    const { error } = await (supabase as any).from("sales").insert({
      cashier_id: user.id,
      branch_id: currentBranch.id,
      invoice_number,
      customer_id: sale.customer_id || null,
      items: sale.items.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      subtotal: sale.subtotal,
      tax_amount: sale.tax_amount || 0,
      total: sale.total,
      discount: sale.discount,
      payment_method: sale.paymentMethod,
    });
    if (error) { toast.error("خطأ في حفظ عملية البيع"); console.error(error); return { ok: false }; }

    // Decrement branch stock per item
    for (const it of sale.items) {
      const { data: row } = await (supabase as any)
        .from("branch_stock")
        .select("stock")
        .eq("branch_id", currentBranch.id)
        .eq("product_id", it.product.id)
        .maybeSingle();
      const current = Number(row?.stock || 0);
      await (supabase as any).from("branch_stock").upsert(
        { branch_id: currentBranch.id, product_id: it.product.id, stock: Math.max(0, current - it.quantity) },
        { onConflict: "branch_id,product_id" }
      );
    }

    // Loyalty points
    if (sale.customer_id) {
      const { data: cust } = await (supabase as any)
        .from("customers").select("loyalty_points, total_purchases").eq("id", sale.customer_id).maybeSingle();
      if (cust) {
        const { data: settings } = await (supabase as any)
          .from("store_settings").select("loyalty_points_per_unit").limit(1).maybeSingle();
        const rate = Number(settings?.loyalty_points_per_unit ?? 0.01);
        await (supabase as any).from("customers").update({
          loyalty_points: Math.floor((cust.loyalty_points || 0) + sale.total * rate),
          total_purchases: Number(cust.total_purchases || 0) + sale.total,
        }).eq("id", sale.customer_id);
      }
    }

    return { ok: true, invoice_number };
  };

  return { saveSale };
}
